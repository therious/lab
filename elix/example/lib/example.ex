defmodule Example do
  use Application
  alias UUID

  @moduledoc """
  Documentation for `Example`.
  """

  @doc """
  Hello world.

  ## Examples
      iex> Example.hello()
      :world
  """

  # attributes
  @x 11

  def yowsa(min), do; min+10

  def hello do
    :world
  end

  def psomething do
    IO.puts(@x)
    IO.puts(hello())
    IO.puts(UUID.uuid4())
  end

  def start(_type, _args) do
    psomething()
    Supervisor.start_link([], strategy: :one_for_one)
  end
end
