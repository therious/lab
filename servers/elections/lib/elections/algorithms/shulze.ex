defmodule Elections.Algorithms.Shulze do
  @moduledoc """
  Shulze method (Schulze method) implementation.
  """

  def calculate(election, votes) do
    # Similar to Ranked Pairs but uses strongest path algorithm
    rankings = extract_rankings(votes, election.config)
    pairwise = build_pairwise_matrix(rankings, election.config)
    strongest_paths = compute_strongest_paths(pairwise, election.config)
    winners = determine_winners(strongest_paths, election.config, election.number_of_winners)

    %{
      method: "shulze",
      winners: winners,
      pairwise: pairwise,
      strongest_paths: strongest_paths,
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
        Enum.map(band_candidates, fn candidate -> {candidate, score} end)
      end)

    unranked = Map.get(ballot, "unranked", [])
    ranking ++ Enum.map(unranked, fn candidate -> {candidate, -1} end)
  end

  defp build_pairwise_matrix(rankings, config) do
    candidates = get_in(config, ["candidates"]) || []
    candidate_names = Enum.map(candidates, & &1["name"])

    matrix =
      for c1 <- candidate_names, c2 <- candidate_names, c1 != c2, into: %{} do
        {{c1, c2}, 0}
      end

    Enum.reduce(rankings, matrix, fn ranking, acc ->
      Enum.reduce(ranking, acc, fn {candidate, _score}, matrix_acc ->
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

  defp compute_strongest_paths(pairwise, config) do
    candidates = get_in(config, ["candidates"]) || []
    candidate_names = Enum.map(candidates, & &1["name"])

    # Initialize path strengths
    paths =
      for c1 <- candidate_names, c2 <- candidate_names, c1 != c2, into: %{} do
        {{c1, c2}, Map.get(pairwise, {c1, c2}, 0)}
      end

    # Floyd-Warshall algorithm to find strongest paths
    Enum.reduce(candidate_names, paths, fn k, acc ->
      Enum.reduce(candidate_names, acc, fn i, acc2 ->
        Enum.reduce(candidate_names, acc2, fn j, acc3 ->
          if i != j && i != k && j != k do
            current = Map.get(acc3, {i, j}, 0)
            via_k = min(Map.get(acc3, {i, k}, 0), Map.get(acc3, {k, j}, 0))
            Map.put(acc3, {i, j}, max(current, via_k))
          else
            acc3
          end
        end)
      end)
    end)
  end

  defp determine_winners(strongest_paths, config, number_of_winners) do
    candidates = get_in(config, ["candidates"]) || []
    candidate_names = Enum.map(candidates, & &1["name"])

    # A candidate wins if for all other candidates, the path from this candidate is stronger
    winners =
      Enum.filter(candidate_names, fn candidate ->
        Enum.all?(candidate_names, fn other ->
          candidate == other ||
            Map.get(strongest_paths, {candidate, other}, 0) >=
              Map.get(strongest_paths, {other, candidate}, 0)
        end)
      end)

    # If we have more winners than needed, rank by total path strength
    if length(winners) > number_of_winners do
      winners
      |> Enum.map(fn candidate ->
        total_strength =
          Enum.sum(
            Enum.map(candidate_names, fn other ->
              if candidate != other, do: Map.get(strongest_paths, {candidate, other}, 0), else: 0
            end)
          )

        {candidate, total_strength}
      end)
      |> Enum.sort_by(fn {_c, strength} -> -strength end)
      |> Enum.take(number_of_winners)
      |> Enum.map(&elem(&1, 0))
    else
      Enum.take(winners, number_of_winners)
    end
  end
end

