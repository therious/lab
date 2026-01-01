defmodule Elections.Algorithms.Score do
  @moduledoc """
  Score voting algorithm (0-5 scale).
  """

  def calculate(ballot, votes) do
    # Extract scores from ballot_data
    scores = extract_scores(votes, ballot)

    # Calculate average score for each candidate
    candidate_scores =
      scores
      |> Enum.group_by(fn {candidate, _score} -> candidate end)
      |> Enum.map(fn {candidate, score_list} ->
        avg_score = Enum.sum(Enum.map(score_list, fn {_, score} -> score end)) / length(score_list)
        {candidate, avg_score}
      end)
      |> Enum.sort_by(fn {_candidate, score} -> -score end)
      |> Enum.into(%{})

    number_of_winners = Map.get(ballot, "number_of_winners", 1)
    
    # Select top N winners with ordering information
    winners_with_scores = candidate_scores 
      |> Enum.sort_by(fn {_candidate, score} -> -score end)
      |> Enum.take(number_of_winners)
    
    winners = Enum.map(winners_with_scores, &elem(&1, 0))
    
    # Build winner_order with statistical tie detection
    winner_order = build_winner_order(winners_with_scores, "statistical")

    %{
      method: "score",
      winners: winners,
      scores: candidate_scores,
      winner_order: winner_order,
      status: if(length(winners) >= number_of_winners, do: "conclusive", else: "inconclusive")
    }
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

  defp extract_scores(votes, _config) do
    Enum.flat_map(votes, fn vote ->
      ballot = vote.ballot_data || %{}
      extract_candidate_scores(ballot)
    end)
  end

  defp extract_candidate_scores(ballot) do
    # Extract scores from bands 0-5
    # Unranked candidates are not included in score calculation
    Enum.flat_map(0..5, fn score ->
      candidates = Map.get(ballot, Integer.to_string(score), [])
      Enum.map(candidates, fn candidate -> {candidate, score} end)
    end)
  end
end

