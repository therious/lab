defmodule Elections.Algorithms.Coombs do
  @moduledoc """
  Coombs method (variant of IRV that eliminates most-disliked candidates).
  """

  def calculate(election, votes) do
    rankings = extract_rankings(votes, election.config)
    winners = run_coombs(rankings, election.config, election.number_of_winners)

    %{
      method: "coombs",
      winners: winners,
      status: if(length(winners) >= election.number_of_winners, do: "conclusive", else: "inconclusive")
    }
  end

  defp extract_rankings(votes, config) do
    Enum.map(votes, fn vote ->
      ballot = vote.ballot_data || %{}
      build_ranking_from_ballot(ballot, config)
    end)
  end

  defp build_ranking_from_ballot(ballot, _config) do
    ranking =
      Enum.flat_map(5..0//-1, fn score ->
        band_candidates = Map.get(ballot, Integer.to_string(score), [])
        band_candidates
      end)

    ranking
  end

  defp run_coombs(rankings, config, number_of_winners) do
    candidates = get_in(config, ["candidates"]) || []
    candidate_names = Enum.map(candidates, & &1["name"])
    total_votes = length(rankings)
    quota = div(total_votes, number_of_winners + 1) + 1

    run_coombs_rounds(rankings, candidate_names, [], number_of_winners, quota)
  end

  defp run_coombs_rounds(_rankings, _remaining, winners, number_of_winners, _quota) when length(winners) >= number_of_winners do
    winners
  end

  defp run_coombs_rounds(rankings, remaining, winners, number_of_winners, quota) do
    # Count first preferences
    first_prefs = count_first_preferences(rankings, remaining)

    # Check for candidates meeting quota
    {new_winners, still_remaining} =
      Enum.split_with(first_prefs, fn {_candidate, count} -> count >= quota end)

    new_winners_names = Enum.map(new_winners, &elem(&1, 0))

    if length(new_winners_names) > 0 do
      # Transfer surplus votes
      updated_rankings = transfer_surplus_votes(rankings, new_winners_names, quota)
      run_coombs_rounds(updated_rankings, still_remaining |> Enum.map(&elem(&1, 0)), winners ++ new_winners_names, number_of_winners, quota)
    else
      # Eliminate candidate with most last-place votes (Coombs variant)
      last_prefs = count_last_preferences(rankings, remaining)
      {_most_disliked, _count} = Enum.max_by(last_prefs, fn {_c, count} -> count end)
      eliminated = last_prefs |> Enum.max_by(fn {_c, count} -> count end) |> elem(0)
      updated_rankings = eliminate_candidate(rankings, eliminated)
      run_coombs_rounds(updated_rankings, List.delete(remaining, eliminated), winners, number_of_winners, quota)
    end
  end

  defp count_first_preferences(rankings, remaining) do
    Enum.reduce(rankings, %{}, fn ranking, acc ->
      first_choice = Enum.find(ranking, fn candidate -> candidate in remaining end)

      if first_choice do
        Map.update(acc, first_choice, 1, &(&1 + 1))
      else
        acc
      end
    end)
    |> Enum.to_list()
  end

  defp count_last_preferences(rankings, remaining) do
    Enum.reduce(rankings, %{}, fn ranking, acc ->
      # Find last preference among remaining candidates
      last_choice =
        ranking
        |> Enum.reverse()
        |> Enum.find(fn candidate -> candidate in remaining end)

      if last_choice do
        Map.update(acc, last_choice, 1, &(&1 + 1))
      else
        acc
      end
    end)
    |> Enum.to_list()
  end

  defp transfer_surplus_votes(rankings, winners, quota) do
    # For each winner, transfer surplus votes proportionally
    Enum.reduce(winners, rankings, fn winner, acc_rankings ->
      winner_votes = Enum.count(acc_rankings, fn r -> List.first(r) == winner end)
      surplus = winner_votes - quota

      if surplus > 0 do
        {winner_rankings, other_rankings} =
          Enum.split_with(acc_rankings, fn r -> List.first(r) == winner end)

        transfer_count = min(surplus, length(winner_rankings))
        {to_transfer, to_keep} = Enum.split(winner_rankings, transfer_count)

        transferred = Enum.map(to_transfer, fn r -> List.delete(r, winner) end)
        kept = Enum.map(to_keep, fn r -> List.delete(r, winner) end)

        other_rankings ++ transferred ++ kept
      else
        acc_rankings
      end
    end)
  end

  defp eliminate_candidate(rankings, eliminated) do
    Enum.map(rankings, fn ranking ->
      List.delete(ranking, eliminated)
    end)
  end
end

