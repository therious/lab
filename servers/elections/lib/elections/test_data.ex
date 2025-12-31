defmodule Elections.TestData do
  @moduledoc """
  Helper module for creating test data, including sample votes for closed elections.
  """

  alias Elections.RepoManager
  alias Elections.{Election, VoteToken, Vote}

  @doc """
  Create sample votes for the Walnut Hills High School election.
  """
  def create_walnut_hills_votes do
    election_identifier = "walnut-hills-high-school-2025"
    
    RepoManager.with_repo(election_identifier, fn repo ->
      case repo.get_by(Election, identifier: election_identifier) do
        nil ->
          {:error, :election_not_found}

        election ->
          # Create 10 sample votes with realistic distributions
          votes = [
            # Vote 1: Strong preference for Alexandra Chen for President
            %{
              "Student Body President" => %{
                "5" => ["Alexandra Chen"],
                "4" => ["Chloe Kim"],
                "3" => ["Benjamin Rodriguez"],
                "2" => ["Daniel Park"],
                "1" => ["Emma Thompson"],
                "0" => [],
                "unranked" => []
              },
              "Student Body Treasurer" => %{
                "5" => ["Grace Lee"],
                "4" => ["Felix Martinez"],
                "3" => ["Henry Wilson"],
                "2" => ["Isabella Garcia"],
                "1" => [],
                "0" => [],
                "unranked" => []
              },
              "Student Body Secretary" => %{
                "5" => ["Katherine Brown"],
                "4" => ["Maya Patel"],
                "3" => ["Jacob Anderson"],
                "2" => ["Liam O'Connor"],
                "1" => [],
                "0" => [],
                "unranked" => []
              },
              "School Council" => %{
                "5" => ["Noah Singh", "Olivia Zhang", "Parker Johnson"],
                "4" => ["Quinn Murphy", "Rachel Cohen"],
                "3" => ["Samuel Kim", "Tara Williams"],
                "2" => ["Uma Patel", "Victor Martinez"],
                "1" => ["Wendy Chen"],
                "0" => [],
                "unranked" => ["Xavier Rodriguez", "Yara Ali", "Zachary Brown", "Ava Davis", "Blake Taylor", "Cora White", "Dylan Harris", "Ella Clark", "Finn Lewis", "Gina Walker", "Hugo Green", "Iris Adams", "Jack Hill"]
              }
            },
            # Vote 2: Different preferences
            %{
              "Student Body President" => %{
                "5" => ["Benjamin Rodriguez"],
                "4" => ["Daniel Park"],
                "3" => ["Alexandra Chen"],
                "2" => ["Chloe Kim"],
                "1" => ["Emma Thompson"],
                "0" => [],
                "unranked" => []
              },
              "Student Body Treasurer" => %{
                "5" => ["Felix Martinez"],
                "4" => ["Henry Wilson"],
                "3" => ["Grace Lee"],
                "2" => ["Isabella Garcia"],
                "1" => [],
                "0" => [],
                "unranked" => []
              },
              "Student Body Secretary" => %{
                "5" => ["Maya Patel"],
                "4" => ["Liam O'Connor"],
                "3" => ["Katherine Brown"],
                "2" => ["Jacob Anderson"],
                "1" => [],
                "0" => [],
                "unranked" => []
              },
              "School Council" => %{
                "5" => ["Rachel Cohen", "Samuel Kim"],
                "4" => ["Tara Williams", "Uma Patel", "Victor Martinez"],
                "3" => ["Wendy Chen", "Xavier Rodriguez"],
                "2" => ["Yara Ali"],
                "1" => ["Zachary Brown"],
                "0" => [],
                "unranked" => ["Noah Singh", "Olivia Zhang", "Parker Johnson", "Quinn Murphy", "Ava Davis", "Blake Taylor", "Cora White", "Dylan Harris", "Ella Clark", "Finn Lewis", "Gina Walker", "Hugo Green", "Iris Adams", "Jack Hill"]
              }
            },
            # Vote 3: Another distribution
            %{
              "Student Body President" => %{
                "5" => ["Chloe Kim"],
                "4" => ["Emma Thompson"],
                "3" => ["Alexandra Chen"],
                "2" => ["Benjamin Rodriguez"],
                "1" => ["Daniel Park"],
                "0" => [],
                "unranked" => []
              },
              "Student Body Treasurer" => %{
                "5" => ["Isabella Garcia"],
                "4" => ["Grace Lee"],
                "3" => ["Felix Martinez"],
                "2" => ["Henry Wilson"],
                "1" => [],
                "0" => [],
                "unranked" => []
              },
              "Student Body Secretary" => %{
                "5" => ["Jacob Anderson"],
                "4" => ["Katherine Brown"],
                "3" => ["Liam O'Connor"],
                "2" => ["Maya Patel"],
                "1" => [],
                "0" => [],
                "unranked" => []
              },
              "School Council" => %{
                "5" => ["Parker Johnson", "Quinn Murphy"],
                "4" => ["Noah Singh", "Olivia Zhang", "Rachel Cohen"],
                "3" => ["Samuel Kim"],
                "2" => ["Tara Williams"],
                "1" => ["Uma Patel"],
                "0" => [],
                "unranked" => ["Victor Martinez", "Wendy Chen", "Xavier Rodriguez", "Yara Ali", "Zachary Brown", "Ava Davis", "Blake Taylor", "Cora White", "Dylan Harris", "Ella Clark", "Finn Lewis", "Gina Walker", "Hugo Green", "Iris Adams", "Jack Hill"]
              }
            },
            # Vote 4-10: More varied distributions
            %{
              "Student Body President" => %{
                "5" => ["Daniel Park"],
                "4" => ["Alexandra Chen"],
                "3" => ["Chloe Kim"],
                "2" => ["Benjamin Rodriguez"],
                "1" => ["Emma Thompson"],
                "0" => [],
                "unranked" => []
              },
              "Student Body Treasurer" => %{
                "5" => ["Henry Wilson"],
                "4" => ["Felix Martinez"],
                "3" => ["Isabella Garcia"],
                "2" => ["Grace Lee"],
                "1" => [],
                "0" => [],
                "unranked" => []
              },
              "Student Body Secretary" => %{
                "5" => ["Liam O'Connor"],
                "4" => ["Maya Patel"],
                "3" => ["Jacob Anderson"],
                "2" => ["Katherine Brown"],
                "1" => [],
                "0" => [],
                "unranked" => []
              },
              "School Council" => %{
                "5" => ["Tara Williams", "Uma Patel"],
                "4" => ["Victor Martinez", "Wendy Chen", "Xavier Rodriguez"],
                "3" => ["Yara Ali", "Zachary Brown"],
                "2" => ["Ava Davis"],
                "1" => ["Blake Taylor"],
                "0" => [],
                "unranked" => ["Noah Singh", "Olivia Zhang", "Parker Johnson", "Quinn Murphy", "Rachel Cohen", "Samuel Kim", "Cora White", "Dylan Harris", "Ella Clark", "Finn Lewis", "Gina Walker", "Hugo Green", "Iris Adams", "Jack Hill"]
              }
            },
            %{
              "Student Body President" => %{
                "5" => ["Emma Thompson"],
                "4" => ["Chloe Kim"],
                "3" => ["Daniel Park"],
                "2" => ["Alexandra Chen"],
                "1" => ["Benjamin Rodriguez"],
                "0" => [],
                "unranked" => []
              },
              "Student Body Treasurer" => %{
                "5" => ["Grace Lee"],
                "4" => ["Isabella Garcia"],
                "3" => ["Felix Martinez"],
                "2" => ["Henry Wilson"],
                "1" => [],
                "0" => [],
                "unranked" => []
              },
              "Student Body Secretary" => %{
                "5" => ["Katherine Brown"],
                "4" => ["Jacob Anderson"],
                "3" => ["Maya Patel"],
                "2" => ["Liam O'Connor"],
                "1" => [],
                "0" => [],
                "unranked" => []
              },
              "School Council" => %{
                "5" => ["Victor Martinez", "Wendy Chen"],
                "4" => ["Xavier Rodriguez", "Yara Ali", "Zachary Brown"],
                "3" => ["Ava Davis", "Blake Taylor"],
                "2" => ["Cora White"],
                "1" => ["Dylan Harris"],
                "0" => [],
                "unranked" => ["Noah Singh", "Olivia Zhang", "Parker Johnson", "Quinn Murphy", "Rachel Cohen", "Samuel Kim", "Tara Williams", "Uma Patel", "Ella Clark", "Finn Lewis", "Gina Walker", "Hugo Green", "Iris Adams", "Jack Hill"]
              }
            },
            %{
              "Student Body President" => %{
                "5" => ["Alexandra Chen"],
                "4" => ["Benjamin Rodriguez"],
                "3" => ["Chloe Kim"],
                "2" => ["Emma Thompson"],
                "1" => ["Daniel Park"],
                "0" => [],
                "unranked" => []
              },
              "Student Body Treasurer" => %{
                "5" => ["Felix Martinez"],
                "4" => ["Grace Lee"],
                "3" => ["Henry Wilson"],
                "2" => ["Isabella Garcia"],
                "1" => [],
                "0" => [],
                "unranked" => []
              },
              "Student Body Secretary" => %{
                "5" => ["Maya Patel"],
                "4" => ["Katherine Brown"],
                "3" => ["Liam O'Connor"],
                "2" => ["Jacob Anderson"],
                "1" => [],
                "0" => [],
                "unranked" => []
              },
              "School Council" => %{
                "5" => ["Noah Singh", "Olivia Zhang"],
                "4" => ["Parker Johnson", "Quinn Murphy", "Rachel Cohen"],
                "3" => ["Samuel Kim", "Tara Williams"],
                "2" => ["Uma Patel"],
                "1" => ["Victor Martinez"],
                "0" => [],
                "unranked" => ["Wendy Chen", "Xavier Rodriguez", "Yara Ali", "Zachary Brown", "Ava Davis", "Blake Taylor", "Cora White", "Dylan Harris", "Ella Clark", "Finn Lewis", "Gina Walker", "Hugo Green", "Iris Adams", "Jack Hill"]
              }
            },
            %{
              "Student Body President" => %{
                "5" => ["Benjamin Rodriguez"],
                "4" => ["Chloe Kim"],
                "3" => ["Alexandra Chen"],
                "2" => ["Daniel Park"],
                "1" => ["Emma Thompson"],
                "0" => [],
                "unranked" => []
              },
              "Student Body Treasurer" => %{
                "5" => ["Henry Wilson"],
                "4" => ["Felix Martinez"],
                "3" => ["Grace Lee"],
                "2" => ["Isabella Garcia"],
                "1" => [],
                "0" => [],
                "unranked" => []
              },
              "Student Body Secretary" => %{
                "5" => ["Jacob Anderson"],
                "4" => ["Maya Patel"],
                "3" => ["Katherine Brown"],
                "2" => ["Liam O'Connor"],
                "1" => [],
                "0" => [],
                "unranked" => []
              },
              "School Council" => %{
                "5" => ["Rachel Cohen", "Samuel Kim", "Tara Williams"],
                "4" => ["Uma Patel", "Victor Martinez"],
                "3" => ["Wendy Chen"],
                "2" => ["Xavier Rodriguez"],
                "1" => ["Yara Ali"],
                "0" => [],
                "unranked" => ["Noah Singh", "Olivia Zhang", "Parker Johnson", "Quinn Murphy", "Zachary Brown", "Ava Davis", "Blake Taylor", "Cora White", "Dylan Harris", "Ella Clark", "Finn Lewis", "Gina Walker", "Hugo Green", "Iris Adams", "Jack Hill"]
              }
            },
            %{
              "Student Body President" => %{
                "5" => ["Chloe Kim"],
                "4" => ["Alexandra Chen"],
                "3" => ["Benjamin Rodriguez"],
                "2" => ["Emma Thompson"],
                "1" => ["Daniel Park"],
                "0" => [],
                "unranked" => []
              },
              "Student Body Treasurer" => %{
                "5" => ["Isabella Garcia"],
                "4" => ["Grace Lee"],
                "3" => ["Felix Martinez"],
                "2" => ["Henry Wilson"],
                "1" => [],
                "0" => [],
                "unranked" => []
              },
              "Student Body Secretary" => %{
                "5" => ["Liam O'Connor"],
                "4" => ["Jacob Anderson"],
                "3" => ["Maya Patel"],
                "2" => ["Katherine Brown"],
                "1" => [],
                "0" => [],
                "unranked" => []
              },
              "School Council" => %{
                "5" => ["Parker Johnson", "Quinn Murphy", "Rachel Cohen"],
                "4" => ["Samuel Kim", "Tara Williams"],
                "3" => ["Uma Patel"],
                "2" => ["Victor Martinez"],
                "1" => ["Wendy Chen"],
                "0" => [],
                "unranked" => ["Noah Singh", "Olivia Zhang", "Xavier Rodriguez", "Yara Ali", "Zachary Brown", "Ava Davis", "Blake Taylor", "Cora White", "Dylan Harris", "Ella Clark", "Finn Lewis", "Gina Walker", "Hugo Green", "Iris Adams", "Jack Hill"]
              }
            },
            %{
              "Student Body President" => %{
                "5" => ["Daniel Park"],
                "4" => ["Emma Thompson"],
                "3" => ["Chloe Kim"],
                "2" => ["Alexandra Chen"],
                "1" => ["Benjamin Rodriguez"],
                "0" => [],
                "unranked" => []
              },
              "Student Body Treasurer" => %{
                "5" => ["Felix Martinez"],
                "4" => ["Isabella Garcia"],
                "3" => ["Henry Wilson"],
                "2" => ["Grace Lee"],
                "1" => [],
                "0" => [],
                "unranked" => []
              },
              "Student Body Secretary" => %{
                "5" => ["Maya Patel"],
                "4" => ["Liam O'Connor"],
                "3" => ["Katherine Brown"],
                "2" => ["Jacob Anderson"],
                "1" => [],
                "0" => [],
                "unranked" => []
              },
              "School Council" => %{
                "5" => ["Noah Singh", "Olivia Zhang", "Parker Johnson"],
                "4" => ["Quinn Murphy", "Rachel Cohen"],
                "3" => ["Samuel Kim"],
                "2" => ["Tara Williams"],
                "1" => ["Uma Patel"],
                "0" => [],
                "unranked" => ["Victor Martinez", "Wendy Chen", "Xavier Rodriguez", "Yara Ali", "Zachary Brown", "Ava Davis", "Blake Taylor", "Cora White", "Dylan Harris", "Ella Clark", "Finn Lewis", "Gina Walker", "Hugo Green", "Iris Adams", "Jack Hill"]
              }
            },
            %{
              "Student Body President" => %{
                "5" => ["Alexandra Chen"],
                "4" => ["Daniel Park"],
                "3" => ["Benjamin Rodriguez"],
                "2" => ["Chloe Kim"],
                "1" => ["Emma Thompson"],
                "0" => [],
                "unranked" => []
              },
              "Student Body Treasurer" => %{
                "5" => ["Grace Lee"],
                "4" => ["Felix Martinez"],
                "3" => ["Isabella Garcia"],
                "2" => ["Henry Wilson"],
                "1" => [],
                "0" => [],
                "unranked" => []
              },
              "Student Body Secretary" => %{
                "5" => ["Katherine Brown"],
                "4" => ["Maya Patel"],
                "3" => ["Liam O'Connor"],
                "2" => ["Jacob Anderson"],
                "1" => [],
                "0" => [],
                "unranked" => []
              },
              "School Council" => %{
                "5" => ["Tara Williams", "Uma Patel", "Victor Martinez"],
                "4" => ["Wendy Chen", "Xavier Rodriguez"],
                "3" => ["Yara Ali"],
                "2" => ["Zachary Brown"],
                "1" => ["Ava Davis"],
                "0" => [],
                "unranked" => ["Noah Singh", "Olivia Zhang", "Parker Johnson", "Quinn Murphy", "Rachel Cohen", "Samuel Kim", "Blake Taylor", "Cora White", "Dylan Harris", "Ella Clark", "Finn Lewis", "Gina Walker", "Hugo Green", "Iris Adams", "Jack Hill"]
              }
            }
          ]

          # Create tokens and votes
          Enum.each(1..10, fn vote_num ->
            # Generate tokens
            token = generate_uuid()
            view_token = generate_uuid()

            # Create vote token
            vote_token = VoteToken.changeset(%VoteToken{}, %{
              token: token,
              election_id: election.id,
              view_token: view_token,
              used: true,
              used_at: DateTime.utc_now(),
              preview: false
            }) |> repo.insert!()

            # Create vote
            vote_data = Enum.at(votes, vote_num - 1)
            Vote.changeset(%Vote{}, %{
              election_id: election.id,
              vote_token_id: vote_token.id,
              ballot_data: vote_data
            }) |> repo.insert!()
          end)

          {:ok, :created}
      end
    end)
  end

  defp generate_uuid do
    <<u0::48, _::4, u1::12, _::2, u2::62>> = :crypto.strong_rand_bytes(16)
    <<u0::48, 4::4, u1::12, 2::2, u2::62>>
    |> Base.encode16(case: :lower)
    |> String.downcase()
    |> then(fn hex ->
      String.slice(hex, 0, 8) <> "-" <>
        String.slice(hex, 8, 4) <> "-" <>
        String.slice(hex, 12, 4) <> "-" <>
        String.slice(hex, 16, 4) <> "-" <>
        String.slice(hex, 20, 12)
    end)
  end
end

