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
    
    # Select top N winners
    winners = candidate_scores 
      |> Enum.sort_by(fn {_candidate, score} -> -score end)
      |> Enum.take(number_of_winners) 
      |> Enum.map(&elem(&1, 0))

    %{
      method: "score",
      winners: winners,
      scores: candidate_scores,
      status: if(length(winners) >= number_of_winners, do: "conclusive", else: "inconclusive")
    }
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

