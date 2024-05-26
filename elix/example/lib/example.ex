defmodule Example do
  @moduledoc """
  Documentation for `Example`.
  """

  @doc """
  Hello world.

  ## Examples
      iex> Example.hello()
      :world
  """

  def hello do
    :world
  end

  def psomething do
    IO.puts(hello())
  end

  def start(_type, _args) do
    psomething()
    Supervisor.start_link([], strategy: :one_for_one)
  end
end
