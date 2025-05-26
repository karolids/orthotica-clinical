import { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';

export default function Home() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef(null);

  const adjustTextareaHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setLoading(true);
    const newHistory = [...chatHistory, { role: 'user', content: input }];
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: newHistory }),
    });
    const data = await res.json();
    const newResponse = data.answer || 'No response from AI.';
    setChatHistory([...newHistory, { role: 'assistant', content: newResponse }]);
    setResponse(newResponse);
    setInput('');
    setLoading(false);
  };

  const exportToPDF = () => {
    const element = document.getElementById('response-container');
    if (!element) return;

    const opt = {
      margin: 0.5,
      filename: 'Orthotica_Clinical_Summary.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 1.5, scrollY: 0 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="min-h-screen bg-white text-orthoticaBlack font-sans px-6 py-8">
      <div className="w-full max-w-5xl mx-auto space-y-8">
        <header className="border-b border-orthoticaGray pb-4 text-center">
          <div className="flex justify-center">
            <img src="/orthotica-logo.png" alt="Orthotica Labs" className="h-24 mb-4" />
          </div>
          <h1 className="text-2xl font-bold uppercase text-orthoticaGray">Hi, I'm Francis!</h1>
          <p className="text-lg text-orthoticaGray">I'm your Orthotica Clinical Advisor</p>
          <p className="text-orthoticaGray">Describe your patient’s condition, and we’ll recommend orthotic or AFO modifications.</p>
        </header>

        <div className="bg-gray-100 p-4 rounded-xl border border-orthoticaGray">
          <textarea
            ref={textareaRef}
            rows={1}
            className="w-full text-lg leading-relaxed border border-orthoticaGray rounded-md p-4 resize-none overflow-hidden focus:outline-none focus:ring-2 focus:ring-orthoticaPink"
            placeholder="Enter your clinical question or patient case here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            onClick={handleSubmit}
            className="mt-4 min-w-[300px] bg-orthoticaPink text-white font-semibold px-6 py-3 rounded-lg hover:bg-pink-400 transition text-center"
            disabled={loading}
          >
            {loading ? (
              <span>
                I’m thinking<span className="dot-animate">.</span><span className="dot-animate">.</span><span className="dot-animate">.</span> Please be patient, I’m just a Flamingo 🦩
              </span>
            ) : 'Submit'}
          </button>
        </div>

        {response && (
          <div
            id="response-container"
            className="prose prose-lg bg-white border border-orthoticaPink p-6 rounded-xl shadow-sm"
            style={{
              fontFamily: 'Arial',
              lineHeight: '1.6',
              width: '100%',
              overflowWrap: 'break-word',
              pageBreakInside: 'avoid',
              pageBreakBefore: 'auto',
              pageBreakAfter: 'auto'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <img src="/orthotica-logo.png" alt="Orthotica Labs" style={{ height: '60px' }} />
            </div>
            <div dangerouslySetInnerHTML={{ __html: marked.parse(response) }} />
          </div>
        )}

        {response && (
          <button
            onClick={exportToPDF}
            className="mt-4 bg-orthoticaGray text-white font-semibold px-4 py-2 rounded hover:bg-gray-600 transition"
          >
            Download as PDF
          </button>
        )}
      </div>
    </div>
  );
}
