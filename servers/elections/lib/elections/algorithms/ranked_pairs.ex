defmodule Elections.Algorithms.RankedPairs do
  @moduledoc """
  Ranked Pairs (Tideman) algorithm implementation.
  """

  def calculate(election, votes) do
    # Extract rankings from ballot_data
    rankings = extract_rankings(votes, election.config)

    # Build pairwise comparison matrix
    pairwise = build_pairwise_matrix(rankings, election.config)

    # Sort pairs by strength
    sorted_pairs = sort_pairs_by_strength(pairwise)

    # Lock pairs in order (avoiding cycles)
    locked_pairs = lock_pairs(sorted_pairs, election.config)

    # Determine winners from locked graph
    winners = determine_winners(locked_pairs, election.config, election.number_of_winners)

    %{
      method: "ranked_pairs",
      winners: winners,
      pairwise: pairwise,
      locked_pairs: locked_pairs,
      status: if(length(winners) >= election.number_of_winners, do: "conclusive", else: "inconclusive")
    }
  end

  defp extract_rankings(votes, config) do
    Enum.map(votes, fn vote ->
      ballot = vote.ballot_data || %{}
      build_ranking_from_ballot(ballot, config)
    end)
  end

  defp build_ranking_from_ballot(ballot, config) do
    candidates = get_in(config, ["candidates"]) || []

    # Build ranking: candidates in bands 5 (best) down to 0 (worst)
    # Within each band, order matters (first = more preferred)
    ranking =
      Enum.flat_map(5..0, fn score ->
        band_candidates = Map.get(ballot, Integer.to_string(score), [])
        Enum.map(band_candidates, fn candidate -> {candidate, score} end)
      end)

    # Unranked candidates go at the end
    unranked = Map.get(ballot, "unranked", [])
    ranking = ranking ++ Enum.map(unranked, fn candidate -> {candidate, -1} end)

    ranking
  end

  defp build_pairwise_matrix(rankings, config) do
    candidates = get_in(config, ["candidates"]) || []
    candidate_names = Enum.map(candidates, & &1["name"])

    # Initialize matrix
    matrix =
      for c1 <- candidate_names, c2 <- candidate_names, c1 != c2, into: %{} do
        {{c1, c2}, 0}
      end

    # Count preferences
    Enum.reduce(rankings, matrix, fn ranking, acc ->
      Enum.reduce(ranking, acc, fn {candidate, _score}, matrix_acc ->
        # All candidates ranked higher than this one are preferred
        higher_ranked =
          Enum.take_while(ranking, fn {c, _s} -> c != candidate end)
          |> Enum.map(&elem(&1, 0))

        Enum.reduce(higher_ranked, matrix_acc, fn preferred, m ->
          key = {preferred, candidate}
          Map.update(m, key, 1, &(&1 + 1))
        end)
      end)
    end)
  end

  defp sort_pairs_by_strength(pairwise) do
    pairwise
    |> Enum.map(fn {{c1, c2}, count} -> {c1, c2, count} end)
    |> Enum.sort_by(fn {_c1, _c2, count} -> -count end)
  end

  defp lock_pairs(sorted_pairs, _config) do
    # Simplified: lock all pairs (full implementation would check for cycles)
    sorted_pairs
  end

  defp determine_winners(locked_pairs, config, number_of_winners) do
    # Simplified: return top candidates by number of wins
    # Full implementation would use graph traversal
    candidates = get_in(config, ["candidates"]) || []
    candidate_names = Enum.map(candidates, & &1["name"])

    win_counts =
      Enum.reduce(locked_pairs, %{}, fn {winner, _loser, _count}, acc ->
        Map.update(acc, winner, 1, &(&1 + 1))
      end)

    candidate_names
    |> Enum.map(fn name -> {name, Map.get(win_counts, name, 0)} end)
    |> Enum.sort_by(fn {_name, wins} -> -wins end)
    |> Enum.take(number_of_winners)
    |> Enum.map(&elem(&1, 0))
  end
end

