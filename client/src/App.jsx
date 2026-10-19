import AddItemForm from './components/AddItemForm.jsx';
import AskPanel from './components/AskPanel.jsx';
import ItemList from './components/ItemList.jsx';
import { useItems } from './hooks/useItems.js';

export default function App() {
  const { items, loading, error, addItem, removeItem } = useItems();
  const hasReadyItems = items.some((item) => item.status === 'ready');

  return (
    <main className="app">
      <header>
        <h1>Knowledge Inbox</h1>
        <p className="muted">Save notes and web pages, then ask questions about them.</p>
      </header>
      <AskPanel hasReadyItems={hasReadyItems} />
      <AddItemForm onAdd={addItem} />
      <ItemList items={items} loading={loading} error={error} onDelete={removeItem} />
    </main>
  );
}
