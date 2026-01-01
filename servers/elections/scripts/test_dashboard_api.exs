#!/usr/bin/env elixir

# Test script to verify dashboard API returns results correctly
# Usage: elixir scripts/test_dashboard_api.exs [election_identifier]

Mix.install([])

defmodule DashboardAPITest do
  @base_url "http://localhost:4000"
  
  def run(election_identifier) do
    IO.puts("\n=== Testing Dashboard API ===")
    IO.puts("Election: #{election_identifier}")
    IO.puts("URL: #{@base_url}/api/dashboard/#{election_identifier}\n")
    
    case HTTPoison.get("#{@base_url}/api/dashboard/#{election_identifier}", [
      {"Accept", "application/json"},
      {"Content-Type", "application/json"}
    ]) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        IO.puts("✓ Status: 200 OK")
        case Jason.decode(body) do
          {:ok, data} ->
            IO.puts("\n=== Response Structure ===")
            IO.inspect(data, limit: :infinity, pretty: true)
            
            # Check for results
            ballots = get_in(data, ["results"]) || get_in(data, ["ballots"]) || []
            metadata = get_in(data, ["metadata"]) || %{}
            
            IO.puts("\n=== Analysis ===")
            IO.puts("Ballots found: #{length(ballots)}")
            IO.puts("Total votes: #{metadata["total_votes"] || 0}")
            IO.puts("Voting start: #{metadata["voting_start"] || "N/A"}")
            IO.puts("Voting end: #{metadata["voting_end"] || "N/A"}")
            
            if length(ballots) == 0 do
              IO.puts("\n⚠ WARNING: No ballots in response!")
              IO.puts("This could mean:")
              IO.puts("  1. No votes have been submitted")
              IO.puts("  2. Election has no ballots configured")
              IO.puts("  3. API is returning empty results")
            end
            
            {:ok, data}
          {:error, error} ->
            IO.puts("✗ Failed to parse JSON: #{inspect(error)}")
            IO.puts("Raw response: #{String.slice(body, 0, 500)}")
            {:error, :parse_error}
        end
        
      {:ok, %HTTPoison.Response{status_code: status, body: body}} ->
        IO.puts("✗ Status: #{status}")
        IO.puts("Response: #{String.slice(body, 0, 500)}")
        {:error, status}
        
      {:error, %HTTPoison.Error{reason: reason}} ->
        IO.puts("✗ Request failed: #{inspect(reason)}")
        IO.puts("Make sure the server is running on #{@base_url}")
        {:error, reason}
    end
  end
end

# Check if HTTPoison is available, if not provide instructions
case Code.ensure_loaded(HTTPoison) do
  {:module, HTTPoison} ->
    election_identifier = System.argv() |> List.first() || "walnut-hills-high-school-2025"
    DashboardAPITest.run(election_identifier)
  {:error, _} ->
    IO.puts("""
    This script requires HTTPoison to be available.
    
    To run this test, you can either:
    1. Add HTTPoison to your mix.exs dependencies
    2. Use curl directly:
       curl -H "Accept: application/json" http://localhost:4000/api/dashboard/#{System.argv() |> List.first() || "walnut-hills-high-school-2025"}
    3. Use the Postman collection (see postman_collection.json)
    """)
end

