defmodule Elections.Algorithms.RankedPairs do
  @moduledoc """
  Ranked Pairs (Tideman) algorithm implementation.
  """

  def calculate(ballot, votes) do
    # Extract rankings from ballot_data
    rankings = extract_rankings(votes, ballot)

    # Build pairwise comparison matrix
    pairwise = build_pairwise_matrix(rankings, ballot)

    # Sort pairs by strength
    sorted_pairs = sort_pairs_by_strength(pairwise)

    # Lock pairs in order (avoiding cycles)
    locked_pairs = lock_pairs(sorted_pairs, ballot)

    number_of_winners = Map.get(ballot, "number_of_winners", 1)
    
    # Determine winners from locked graph
    winners = determine_winners(locked_pairs, ballot, number_of_winners)
    
    # Calculate win counts for ordering
    win_counts =
      Enum.reduce(locked_pairs, %{}, fn {winner, _loser, _count}, acc ->
        Map.update(acc, winner, 1, &(&1 + 1))
      end)
    
    # Build winner_order with peculiar tie detection
    winners_with_counts = 
      winners
      |> Enum.map(fn winner -> {winner, Map.get(win_counts, winner, 0)} end)
    
    winner_order = build_winner_order(winners_with_counts, "peculiar")

    %{
      method: "ranked_pairs",
      winners: winners,
      pairwise: pairwise,
      locked_pairs: locked_pairs,
      winner_order: winner_order,
      status: if(length(winners) >= number_of_winners, do: "conclusive", else: "inconclusive")
    }
  end

  defp extract_rankings(votes, config) do
    Enum.map(votes, fn vote ->
      ballot = vote.ballot_data || %{}
      build_ranking_from_ballot(ballot, config)
    end)
  end

  defp build_ranking_from_ballot(ballot, _config) do
    # Build ranking: candidates in bands 5 (best) down to 0 (worst)
    # Within each band, order matters (first = more preferred)
    ranking =
      Enum.flat_map(5..0//-1, fn score ->
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

  defp lock_pairs(sorted_pairs, config) do
    # Lock pairs in order, avoiding cycles
    candidates = get_in(config, ["candidates"]) || []
    candidate_names = Enum.map(candidates, & &1["name"])
    
    locked = []
    locked_pairs(sorted_pairs, locked, candidate_names)
  end

  defp locked_pairs([], locked, _candidates), do: locked

  defp locked_pairs([{c1, c2, strength} | rest], locked, candidates) do
    # Check if adding this pair would create a cycle
    if creates_cycle?(locked, c1, c2, candidates) do
      # Skip this pair if it creates a cycle
      locked_pairs(rest, locked, candidates)
    else
      # Lock this pair
      locked_pairs(rest, [{c1, c2, strength} | locked], candidates)
    end
  end

  defp creates_cycle?(locked_pairs, from, to, candidates) do
    # Check if there's already a path from 'to' to 'from' in locked pairs
    # This would create a cycle if we add 'from' -> 'to'
    has_path?(locked_pairs, to, from, candidates, MapSet.new())
  end

  defp has_path?(_locked_pairs, from, to, _candidates, _visited) when from == to, do: true

  defp has_path?(locked_pairs, from, to, candidates, visited) do
    if MapSet.member?(visited, from) do
      false
    else
      visited = MapSet.put(visited, from)
      
      # Find all candidates that 'from' beats in locked pairs
      next_candidates =
        Enum.filter(locked_pairs, fn {c1, _c2, _s} -> c1 == from end)
        |> Enum.map(fn {_c1, c2, _s} -> c2 end)

      Enum.any?(next_candidates, fn next ->
        next == to || has_path?(locked_pairs, next, to, candidates, visited)
      end)
    end
  end

  defp determine_winners(locked_pairs, config, number_of_winners) do
    candidates = get_in(config, ["candidates"]) || []
    candidate_names = Enum.map(candidates, & &1["name"])

    # Build a graph of who beats whom
    beats = build_beats_graph(locked_pairs, candidate_names)

    # Find candidates that beat all others (Condorcet winners)
    condorcet_winners =
      Enum.filter(candidate_names, fn candidate ->
        Enum.all?(candidate_names, fn other ->
          candidate == other || Map.get(beats, {candidate, other}, false)
        end)
      end)

    # Always calculate win counts for ordering, even for Condorcet winners
    win_counts =
      Enum.reduce(locked_pairs, %{}, fn {winner, _loser, _count}, acc ->
        Map.update(acc, winner, 1, &(&1 + 1))
      end)

    if length(condorcet_winners) >= number_of_winners do
      # Use win counts to order Condorcet winners
      winners_with_counts = 
        condorcet_winners
        |> Enum.map(fn name -> {name, Map.get(win_counts, name, 0)} end)
        |> Enum.sort_by(fn {_name, wins} -> -wins end)
        |> Enum.take(number_of_winners)
      
      Enum.map(winners_with_counts, &elem(&1, 0))
    else
      # If no Condorcet winner, use win counts as tiebreaker
      candidate_names
      |> Enum.map(fn name -> {name, Map.get(win_counts, name, 0)} end)
      |> Enum.sort_by(fn {_name, wins} -> -wins end)
      |> Enum.take(number_of_winners)
      |> Enum.map(&elem(&1, 0))
    end
  end

  defp build_beats_graph(locked_pairs, _candidate_names) do
    Enum.reduce(locked_pairs, %{}, fn {winner, loser, _count}, acc ->
      Map.put(acc, {winner, loser}, true)
    end)
  end

  defp build_winner_order(winners_with_metrics, tie_type) do
    # Group by metric value to detect ties
    grouped = Enum.group_by(winners_with_metrics, fn {_candidate, metric} -> metric end)
    
    # Build ordered list with positions
    {_, order_list} = 
      Enum.reduce(Enum.sort_by(Map.keys(grouped), &(-&1)), {1, []}, fn metric_value, {next_position, acc} ->
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
end

