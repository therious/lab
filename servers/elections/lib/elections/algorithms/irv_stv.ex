defmodule Elections.Algorithms.IRVSTV do
  @moduledoc """
  Instant Runoff Voting (IRV) / Single Transferable Vote (STV) implementation.
  """

  def calculate(ballot, votes) do
    rankings = extract_rankings(votes, ballot)
    winners_with_counts = run_irv_stv(rankings, ballot, Map.get(ballot, "number_of_winners", 1))
    
    # Extract winners and build ordering
    winners = Enum.map(winners_with_counts, fn 
      {winner, _count} -> winner
      winner when is_binary(winner) -> winner  # Backward compatibility
    end)
    
    # Build winner_order with statistical tie detection (vote counts are direct preference)
    winners_with_metrics = Enum.map(winners_with_counts, fn
      {winner, count} -> {winner, count}
      winner when is_binary(winner) -> {winner, nil}  # No count available
    end)
    
    winner_order = if Enum.all?(winners_with_metrics, fn {_w, count} -> count != nil end) do
      build_winner_order(winners_with_metrics, "statistical")
    else
      # No vote counts available - ambiguous ordering
      build_ambiguous_order(winners)
    end

    %{
      method: if(Map.get(ballot, "number_of_winners", 1) == 1, do: "irv", else: "stv"),
      winners: winners,
      winner_order: winner_order,
      status: if(length(winners) >= Map.get(ballot, "number_of_winners", 1), do: "conclusive", else: "inconclusive")
    }
  end
  
  defp build_winner_order(winners_with_metrics, tie_type) do
    # Group by metric value to detect ties
    grouped = Enum.group_by(winners_with_metrics, fn {_candidate, metric} -> metric end)
    
    # Build ordered list with positions
    {_, order_list} = 
      Enum.reduce(Enum.sort_by(Map.keys(grouped), fn m -> if m, do: -m, else: 0 end), {1, []}, fn metric_value, {next_position, acc} ->
        candidates_at_this_metric = Map.get(grouped, metric_value)
        position = next_position
        tied = length(candidates_at_this_metric) > 1
        
        candidates_order = 
          Enum.map(candidates_at_this_metric, fn {candidate, _metric} ->
            %{
              candidate: candidate,
              position: position,
              metric_value: metric_value,
              tied: tied,
              tie_type: if(tied, do: tie_type, else: nil)
            }
          end)
        
        new_next_position = next_position + length(candidates_at_this_metric)
        {new_next_position, acc ++ candidates_order}
      end)
    
    order_list
  end
  
  defp build_ambiguous_order(winners) do
    # No ordering information - all are ambiguously tied
    Enum.map(winners, fn winner ->
      %{
        candidate: winner,
        position: 1,
        metric_value: nil,
        tied: length(winners) > 1,
        tie_type: if(length(winners) > 1, do: "ambiguous", else: nil)
      }
    end)
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

    # Unranked candidates are not included in ranking
    ranking
  end

  defp run_irv_stv(rankings, config, number_of_winners) do
    candidates = get_in(config, ["candidates"]) || []
    candidate_names = Enum.map(candidates, & &1["name"])
    total_votes = length(rankings)
    quota = div(total_votes, number_of_winners + 1) + 1

    run_rounds(rankings, candidate_names, [], number_of_winners, quota)
  end
  
  # Handle both old format (list of names) and new format (list of {name, count})
  defp run_rounds(_rankings, _remaining, winners, number_of_winners, _quota) when length(winners) >= number_of_winners do
    winners
  end

  defp run_rounds(rankings, remaining, winners, number_of_winners, quota) do
    # Count first preferences
    first_prefs = count_first_preferences(rankings, remaining)

    # Check for candidates meeting quota
    {new_winners, still_remaining} =
      Enum.split_with(first_prefs, fn {_candidate, count} -> count >= quota end)

    new_winners_names = Enum.map(new_winners, &elem(&1, 0))
    
    # Track winners with vote counts for ordering
    new_winners_with_counts = Enum.map(new_winners, fn {candidate, count} -> {candidate, count} end)

    if length(new_winners_names) > 0 do
      # Transfer surplus votes
      updated_rankings = transfer_surplus_votes(rankings, new_winners_names, quota)
      run_rounds(updated_rankings, still_remaining |> Enum.map(&elem(&1, 0)), winners ++ new_winners_with_counts, number_of_winners, quota)
    else
      # Eliminate lowest candidate
      # Guard against empty still_remaining (shouldn't happen, but safety check)
      if Enum.empty?(still_remaining) or Enum.empty?(remaining) do
        # No more candidates to eliminate, return current winners
        winners
      else
        eliminated = still_remaining |> Enum.min_by(fn {_c, count} -> count end) |> elem(0)
        updated_rankings = eliminate_candidate(rankings, eliminated)
        run_rounds(updated_rankings, List.delete(remaining, eliminated), winners, number_of_winners, quota)
      end
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

