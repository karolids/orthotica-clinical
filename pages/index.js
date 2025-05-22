import { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';

export default function Home() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef(null);

  // Expand the textarea height based on scroll height
  const adjustTextareaHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  // Adjust height every time input changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResponse('');
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: input }),
    });
    const data = await res.json();
    setResponse(data.answer || 'No response from AI.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans px-4 py-6">
      <div className="w-full max-w-screen-xl mx-auto px-4 space-y-6">
        <header className="border-b pb-4">
          <img src="/orthotica-logo.png" alt="Orthotica Labs" className="h-12 mb-2" />
          <h1 className="text-2xl font-bold">Orthotica Clinical Assistant</h1>
          <p className="text-gray-600">Describe your patient’s condition, and we’ll recommend orthotic or AFO modifications.</p>
        </header>

        <div>
          <textarea
             ref={textareaRef}
  rows={1}
  className="w-full overflow-hidden border border-gray-300 rounded-lg p-3 text-base resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
  placeholder="Enter your clinical question or patient case here..."
  value={input}
  onChange={(e) => setInput(e.target.value)}
          />
          <button
            onClick={handleSubmit}
            className="mt-3 bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg hover:bg-blue-700 transition"
            disabled={loading}
          >
            {loading ? 'Thinking...' : 'Submit'}
          </button>
        </div>

        {response && (
          <div
            className="prose prose-sm bg-gray-50 border border-gray-200 p-4 rounded-lg"
            dangerouslySetInnerHTML={{ __html: marked.parse(response) }}
          />
        )}
      </div>
    </div>
  );
}
