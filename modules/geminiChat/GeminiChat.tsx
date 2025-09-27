import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import { SendIcon, UserIcon, BotIcon } from '../../components/Icons.tsx';

// Define message structure with timestamp
interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

// Provider and Model definitions
const PROVIDERS = {
  gemini: 'Gemini',
  openai: 'OpenAI (ChatGPT)',
  anthropic: 'Anthropic (Claude)',
  grok: 'xAI (Grok)',
};
type ProviderKey = keyof typeof PROVIDERS;

const MODELS_BY_PROVIDER: Record<ProviderKey, Record<string, string>> = {
  gemini: {
    'gemini-2.5-flash': 'Gemini 2.5 Flash',
    'gemini-2.5-pro': 'Gemini 2.5 Pro',
  },
  openai: {
    'gpt-4o': 'GPT-4o',
    'gpt-4-turbo': 'GPT-4 Turbo',
    'gpt-3.5-turbo': 'GPT-3.5 Turbo',
  },
  anthropic: {
    'claude-3-opus-20240229': 'Claude 3 Opus',
    'claude-3-sonnet-20240229': 'Claude 3 Sonnet',
    'claude-3-haiku-20240307': 'Claude 3 Haiku',
  },
  grok: {
    'grok-1': 'Grok-1', // Placeholder as API is not public
  }
};

// Thinking modes
const THINKING_MODES = ['Standard (Default)', 'Quick', 'Extended', 'Extended x2'];
type ThinkingMode = typeof THINKING_MODES[number];

// UI sub-components
const TypingIndicator: React.FC = () => (
    <div className="flex items-center gap-1.5 p-2">
        <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
        <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
        <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce"></span>
    </div>
);

const Avatar: React.FC<{role: 'user' | 'model'}> = ({ role }) => (
    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-neutral-300 ${role === 'user' ? 'bg-purple-600' : 'bg-neutral-700'}`}>
        {role === 'user' ? <UserIcon /> : <BotIcon />}
    </div>
);


const GeminiChat: React.FC = () => {
    const [provider, setProvider] = useState<ProviderKey>('gemini');
    const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
    const [thinkingMode, setThinkingMode] = useState<ThinkingMode>('Standard (Default)');
    
    const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
    const [keyInput, setKeyInput] = useState('');
    
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, isLoading]);
    
    // Load API keys from localStorage on mount
    useEffect(() => {
        try {
            const savedKeys = localStorage.getItem('cs-ai-api-keys');
            if (savedKeys) {
                setApiKeys(JSON.parse(savedKeys));
            }
        } catch (e) {
            console.error("Failed to parse API keys from localStorage", e);
        }
    }, []);

    const saveApiKey = () => {
        if (!keyInput.trim() || provider === 'gemini') return;
        const newKeys = { ...apiKeys, [provider]: keyInput };
        setApiKeys(newKeys);
        localStorage.setItem('cs-ai-api-keys', JSON.stringify(newKeys));
        setKeyInput('');
    };

    // Initialize or re-initialize chat when provider/model/settings change
    useEffect(() => {
        setError(null);
        setMessages([]); // Clear history when settings change
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        if (provider === 'gemini') {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                
                let config: { thinkingConfig?: { thinkingBudget: number } } = {};
                if (selectedModel === 'gemini-2.5-flash' && thinkingMode === 'Quick') {
                    config.thinkingConfig = { thinkingBudget: 0 };
                }
                
                const modelToUse = selectedModel === 'gemini-2.5-pro' ? 'gemini-2.5-flash' : selectedModel;
        
                const newChat = ai.chats.create({
                  model: modelToUse,
                  config: config,
                });
                setChat(newChat);
            } catch(e) {
                setError(e instanceof Error ? e.message : 'Failed to initialize Gemini Chat');
            }
        } else {
            setChat(null); // Not using the Gemini SDK chat object
            if (!apiKeys[provider]) {
                setError(`API key for ${PROVIDERS[provider]} is missing.`);
            }
        }
    }, [provider, selectedModel, thinkingMode, apiKeys]);

    const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newProvider = e.target.value as ProviderKey;
        setProvider(newProvider);
        setSelectedModel(Object.keys(MODELS_BY_PROVIDER[newProvider])[0]);
    };

    const handleStreamedResponse = async (response: Response, processChunk: (chunk: string) => string | null) => {
        if (!response.body) {
            throw new Error("Response body is null");
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let firstChunk = true;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const textChunk = decoder.decode(value);
            const content = processChunk(textChunk);
            
            if (content) {
                 if (firstChunk) {
                    setIsLoading(false);
                    setMessages(prev => [...prev, { role: 'model', text: content, timestamp: new Date() }]);
                    firstChunk = false;
                } else {
                    setMessages(prev => {
                        const lastMessage = prev[prev.length - 1];
                        const updatedLastMessage = { ...lastMessage, text: lastMessage.text + content };
                        return [...prev.slice(0, -1), updatedLastMessage];
                    });
                }
            }
        }
    };
    
    const sendGeminiMessage = async () => {
        if (!chat) return;
        try {
            const responseStream = await chat.sendMessageStream({ message: userInput });
            let firstChunk = true;
            for await (const chunk of responseStream) {
                 if (firstChunk) {
                    setIsLoading(false);
                    setMessages(prev => [...prev, { role: 'model', text: chunk.text, timestamp: new Date() }]);
                    firstChunk = false;
                } else {
                    setMessages(prev => {
                        const lastMessage = prev[prev.length - 1];
                        const updatedLastMessage = { ...lastMessage, text: lastMessage.text + chunk.text };
                        return [...prev.slice(0, -1), updatedLastMessage];
                    });
                }
            }
        } catch (e) {
            throw e;
        }
    };

    const sendOpenAIMessage = async (isOpenAI: boolean) => {
        const apiKey = apiKeys[isOpenAI ? 'openai' : 'grok'];
        if (!apiKey) throw new Error("API Key is missing.");
        
        const endpoint = isOpenAI ? 'https://api.openai.com/v1/chat/completions' : 'https://api.x.ai/v1/chat/completions';
        
        abortControllerRef.current = new AbortController();
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: selectedModel,
                messages: messages.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.text })),
                stream: true,
            }),
            signal: abortControllerRef.current.signal,
        });

        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

        await handleStreamedResponse(response, (chunk) => {
            const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));
            let content = '';
            for (const line of lines) {
                const data = line.substring(5).trim();
                if (data === '[DONE]') break;
                try {
                    const parsed = JSON.parse(data);
                    content += parsed.choices[0]?.delta?.content || '';
                } catch (e) {
                    // ignore parse errors
                }
            }
            return content;
        });
    };
    
    const sendAnthropicMessage = async () => {
        const apiKey = apiKeys.anthropic;
        if (!apiKey) throw new Error("API Key is missing.");

        abortControllerRef.current = new AbortController();
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: messages.map(m => ({ role: m.role, content: m.text })),
                stream: true,
                max_tokens: 4096,
            }),
             signal: abortControllerRef.current.signal,
        });
        
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

        await handleStreamedResponse(response, (chunk) => {
            const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));
            let content = '';
            for (const line of lines) {
                try {
                    const data = JSON.parse(line.substring(5));
                    if (data.type === 'content_block_delta' && data.delta.type === 'text_delta') {
                        content += data.delta.text;
                    }
                } catch (e) {
                     // ignore parse errors
                }
            }
            return content;
        });
    };

    const handleSendMessage = useCallback(async () => {
        if (!userInput.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', text: userInput, timestamp: new Date() };
        setMessages(prev => [...prev, userMessage]);
        setUserInput('');
        setIsLoading(true);
        setError(null);

        try {
            switch (provider) {
                case 'gemini': await sendGeminiMessage(); break;
                case 'openai': await sendOpenAIMessage(true); break;
                case 'anthropic': await sendAnthropicMessage(); break;
                case 'grok': await sendOpenAIMessage(false); break;
            }
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
            setError(`Error: ${errorMessage}`);
            setIsLoading(false);
        } finally {
             if (isLoading) { setIsLoading(false); }
             abortControllerRef.current = null;
        }
    }, [provider, userInput, isLoading, messages, chat, apiKeys, selectedModel]);

    return (
        <div className="flex flex-col h-full bg-[#1c1f2e]">
            <header className="flex-shrink-0 bg-black/20 backdrop-blur-sm border-b border-neutral-800 p-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 z-10">
                <div>
                    <label htmlFor="provider-select" className="text-xs text-neutral-400 mr-2">Provider</label>
                    <select id="provider-select" value={provider} onChange={handleProviderChange} className="bg-neutral-800 text-white p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 border border-neutral-700">
                        {Object.entries(PROVIDERS).map(([key, name]) => (<option key={key} value={key}>{name}</option>))}
                    </select>
                </div>
                <div>
                    <label htmlFor="model-select" className="text-xs text-neutral-400 mr-2">Model</label>
                    <select id="model-select" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="bg-neutral-800 text-white p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 border border-neutral-700">
                       {Object.entries(MODELS_BY_PROVIDER[provider]).map(([key, name]) => (<option key={key} value={key}>{name}</option>))}
                    </select>
                </div>
                {provider === 'gemini' && selectedModel === 'gemini-2.5-flash' && (
                     <div>
                        <label htmlFor="thinking-mode-select" className="text-xs text-neutral-400 mr-2">Thinking Mode</label>
                        <select id="thinking-mode-select" value={thinkingMode} onChange={(e) => setThinkingMode(e.target.value as ThinkingMode)} className="bg-neutral-800 text-white p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 border border-neutral-700">
                           {THINKING_MODES.map(mode => (<option key={mode} value={mode}>{mode}</option>))}
                        </select>
                    </div>
                )}
            </header>
            
            {provider !== 'gemini' && (
                <div className="flex-shrink-0 p-2 text-center bg-neutral-950 border-b border-neutral-800">
                    <div className="flex items-center justify-center gap-2">
                        <label htmlFor="api-key-input" className="text-sm font-medium text-neutral-300">{PROVIDERS[provider]} API Key:</label>
                        <input id="api-key-input" type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder="Enter your API key" className="bg-neutral-800 p-1 rounded-md text-sm w-64 border border-neutral-700"/>
                        <button onClick={saveApiKey} className="px-3 py-1 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700">Save</button>
                        {apiKeys[provider] && <span className="text-green-400 text-sm font-semibold">✓ Saved</span>}
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">Your key is stored locally in your browser and never sent to our servers.</p>
                </div>
            )}

            <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                {messages.length === 0 && !isLoading && (
                    <div className="text-center text-neutral-500 pt-16">
                        <h2 className="text-2xl font-semibold">AI Assistant</h2>
                        <p>Select a provider and start a conversation.</p>
                    </div>
                )}
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-end gap-3 animate-slide-in-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'model' && <Avatar role="model" />}
                        <div className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                             <div className={`max-w-xl p-3 rounded-lg whitespace-pre-wrap ${msg.role === 'user' ? 'bg-purple-600 text-white' : 'bg-neutral-800 text-neutral-200'}`}>
                               {msg.text}
                            </div>
                            <span className="text-xs text-neutral-500 px-1">
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                         {msg.role === 'user' && <Avatar role="user" />}
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-end gap-3 justify-start animate-slide-in-up">
                        <Avatar role="model" />
                        <div className="max-w-xl p-3 rounded-lg bg-neutral-800">
                            <TypingIndicator />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </main>

            <footer className="flex-shrink-0 p-4 bg-neutral-950 border-t border-neutral-800">
                {error && <p className="text-red-400 text-center text-sm mb-2">{error}</p>}
                <div className="flex items-center gap-3 max-w-4xl mx-auto">
                    <textarea
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        placeholder="Type your message..."
                        rows={1}
                        className="flex-1 bg-neutral-800 text-white p-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 border border-neutral-700"
                    />
                    <button onClick={handleSendMessage} disabled={isLoading || !userInput.trim()} className="bg-purple-600 text-white p-3 rounded-full hover:bg-purple-700 disabled:bg-purple-800/50 disabled:cursor-not-allowed transition-transform active:scale-95">
                        <SendIcon />
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default GeminiChat;