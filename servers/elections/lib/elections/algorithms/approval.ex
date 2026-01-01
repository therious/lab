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
    
    # Select top N winners by approval count
    winners = candidate_approvals
      |> Enum.sort_by(fn {_candidate, count} -> -count end)
      |> Enum.take(number_of_winners)
      |> Enum.map(&elem(&1, 0))

    %{
      method: "approval",
      winners: winners,
      approvals: candidate_approvals,
      status: if(length(winners) >= number_of_winners, do: "conclusive", else: "inconclusive")
    }
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

