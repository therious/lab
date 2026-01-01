defmodule Elections.Algorithms.Approval do
  @moduledoc """
  Approval voting algorithm.
  Treats score 0 as disapproval, any other score (1-5) as approval.
  """

  def calculate(ballot, votes) do
    # Extract approval votes from ballot_data
    approvals = extract_approvals(votes, ballot)

    # Count approvals for each candidate
    candidate_approvals =
      approvals
      |> Enum.group_by(fn {candidate, _approved} -> candidate end)
      |> Enum.map(fn {candidate, approval_list} ->
        approval_count = Enum.count(approval_list, fn {_, approved} -> approved end)
        {candidate, approval_count}
      end)
      |> Enum.into(%{})

    number_of_winners = Map.get(ballot, "number_of_winners", 1)
    
    # Select top N winners by approval count with ordering information
    winners_with_counts = candidate_approvals
      |> Enum.sort_by(fn {_candidate, count} -> -count end)
      |> Enum.take(number_of_winners)
    
    winners = Enum.map(winners_with_counts, &elem(&1, 0))
    
    # Build winner_order with statistical tie detection
    winner_order = build_winner_order(winners_with_counts, "statistical")

    %{
      method: "approval",
      winners: winners,
      approvals: candidate_approvals,
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

  defp extract_approvals(votes, _config) do
    Enum.flat_map(votes, fn vote ->
      ballot = vote.ballot_data || %{}
      extract_candidate_approvals(ballot)
    end)
  end

  defp extract_candidate_approvals(ballot) do
    # Get all candidates from all score bands
    all_candidates = Enum.flat_map(0..5, fn score ->
      Map.get(ballot, Integer.to_string(score), [])
    end) |> Enum.uniq()

    # Also include unranked candidates (they are disapproved)
    unranked = Map.get(ballot, "unranked", [])
    all_candidates = (all_candidates ++ unranked) |> Enum.uniq()

    # For each candidate, check if approved (score > 0) or disapproved (score = 0)
    Enum.map(all_candidates, fn candidate ->
      # Find which score band the candidate is in
      approved = Enum.any?(1..5, fn score ->
        candidates_in_band = Map.get(ballot, Integer.to_string(score), [])
        candidate in candidates_in_band
      end)
      {candidate, approved}
    end)
  end
end

