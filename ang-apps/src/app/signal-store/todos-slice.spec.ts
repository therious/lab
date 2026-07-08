import { todosSlice, TodosState, Todo } from './todos-slice';

const { creators: c, reducers: r, initialState: init } = todosSlice;

const item = (id: string, text: string, done = false): Todo => ({ id, text, done });

describe('todos-slice creators', () => {
  it('addTodo carries the text', () => {
    expect(c.addTodo('Buy milk')).toEqual({ text: 'Buy milk' });
  });

  it('removeTodo carries the id', () => {
    expect(c.removeTodo('abc')).toEqual({ id: 'abc' });
  });

  it('toggleTodo carries the id', () => {
    expect(c.toggleTodo('xyz')).toEqual({ id: 'xyz' });
  });

  it('clearDone produces an empty payload', () => {
    expect(c.clearDone()).toEqual({});
  });
});

describe('todos-slice reducers', () => {
  const two: TodosState = { items: [item('1', 'Buy milk'), item('2', 'Walk dog', true)] };

  it('initial state has no items', () => {
    expect(init.items).toHaveSize(0);
  });

  describe('addTodo', () => {
    it('appends a new item', () => {
      const result = r.addTodo(init, { text: 'Buy milk' });
      expect(result.items).toHaveSize(1);
      expect(result.items[0].text).toBe('Buy milk');
    });

    it('new item starts undone', () => {
      const result = r.addTodo(init, { text: 'x' });
      expect(result.items[0].done).toBeFalse();
    });

    it('new item gets a unique id', () => {
      const r1 = r.addTodo(init, { text: 'a' });
      const r2 = r.addTodo(init, { text: 'b' });
      expect(r1.items[0].id).not.toBe(r2.items[0].id);
    });

    it('does not mutate input', () => {
      r.addTodo(init, { text: 'x' });
      expect(init.items).toHaveSize(0);
    });
  });

  describe('removeTodo', () => {
    it('removes by id', () => {
      const result = r.removeTodo(two, { id: '1' });
      expect(result.items).toHaveSize(1);
      expect(result.items[0].id).toBe('2');
    });

    it('is a no-op for an unknown id', () => {
      expect(r.removeTodo(two, { id: 'nope' }).items).toHaveSize(2);
    });
  });

  describe('toggleTodo', () => {
    it('flips done → undone', () => {
      const result = r.toggleTodo(two, { id: '2' });
      expect(result.items.find((t: Todo) => t.id === '2')!.done).toBeFalse();
    });

    it('flips undone → done', () => {
      const result = r.toggleTodo(two, { id: '1' });
      expect(result.items.find((t: Todo) => t.id === '1')!.done).toBeTrue();
    });

    it('does not affect other items', () => {
      const result = r.toggleTodo(two, { id: '1' });
      expect(result.items.find((t: Todo) => t.id === '2')!.done).toBeTrue();
    });
  });

  describe('clearDone', () => {
    it('removes done items', () => {
      const result = r.clearDone(two);
      expect(result.items).toHaveSize(1);
      expect(result.items[0].id).toBe('1');
    });

    it('is a no-op when nothing is done', () => {
      const noDone: TodosState = { items: [item('1', 'x')] };
      expect(r.clearDone(noDone).items).toHaveSize(1);
    });
  });
});
