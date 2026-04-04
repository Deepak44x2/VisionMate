import React, { useState, useEffect } from 'react';
import { speakText, vibrate } from '../services/ttsService';

interface CalculatorProps {
  transcript?: string;
}

const Calculator: React.FC<CalculatorProps> = ({ transcript }) => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');

  useEffect(() => {
    if (!transcript) return;

    const lower = transcript.toLowerCase();

    const hasHeyVision = lower.includes('hey vision');
    const hasTapMic = lower.includes('tap the mic');
    if (!hasHeyVision && !hasTapMic) return;

    let command = lower;
    if (hasHeyVision) command = command.replace('hey vision', '');
    if (hasTapMic) command = command.replace('tap the mic', '');
    command = command.trim();

    if (command.includes('clear calculator') || command === 'clear') {
      vibrate(50);
      speakText('Clear');
      setDisplay('0');
      setEquation('');
      return;
    }

    const shouldCalculate = command.includes(' is');

    const hasMath =
      /[0-9]/.test(command) &&
      /(plus|minus|times|divided|multiplied|\+|-|\*|\/|x)/.test(command);

    if (hasMath) {
      let mathStr = command
        .replace(/(calculate|what is|whats|what's|how much is)/g, '')
        .replace(/is/g, '') // remove "is"
        .replace(/plus/g, '+')
        .replace(/minus/g, '-')
        .replace(/times|multiplied by|into/g, '*')
        .replace(/divided by|over/g, '/')
        .replace(/x/g, '*')
        .replace(/[^0-9+\-*/.]/g, '');

      if (mathStr && /^[0-9+\-*/.]+$/.test(mathStr)) {
        try {
          const result = new Function('return ' + mathStr)();

          if (!isNaN(result) && isFinite(result)) {
            const resultStr = String(result);

            // ✅ Always update UI
            setDisplay(resultStr);
            setEquation(mathStr + ' =');

            // ✅ Speak ONLY if "is" is present
            if (shouldCalculate) {
              vibrate(100);
              speakText(
                mathStr
                  .replace(/\*/g, ' times ')
                  .replace(/\//g, ' divided by ')
                  .replace(/\+/g, ' plus ')
                  .replace(/-/g, ' minus ') +
                  ' equals ' +
                  resultStr
              );
            }
          }
        } catch (e) {
          // ignore
        }
      }
    }
  }, [transcript]);

  const handlePress = (val: string) => {
    vibrate(30);
    speakText(val);

    if (display === '0' && !isNaN(Number(val))) {
      setDisplay(val);
    } else {
      setDisplay(prev => prev + val);
    }
  };

  const handleClear = () => {
    vibrate(50);
    speakText('Clear');
    setDisplay('0');
    setEquation('');
  };

  const handleDelete = () => {
    vibrate(30);
    speakText('Delete');
    setDisplay(prev => (prev.length > 1 ? prev.slice(0, -1) : '0'));
  };

  const handleCalculate = () => {
    vibrate(100);
    try {
      const result = new Function('return ' + display)();
      const resultStr = String(result);
      setDisplay(resultStr);
      setEquation(display + ' =');
      speakText('Equals ' + resultStr);
    } catch (e) {
      setDisplay('Error');
      speakText('Error');
    }
  };

  const buttons = [
    ['C', 'DEL', '/', '*'],
    ['7', '8', '9', '-'],
    ['4', '5', '6', '+'],
    ['1', '2', '3', '='],
    ['0', '.', '']
  ];

  return (
    <div className="flex flex-col h-full w-full bg-black p-4 pb-32">
      <div className="flex-1 flex flex-col justify-end items-end p-4 bg-gray-900 rounded-2xl mb-4 border-4 border-gray-800">
        <div className="text-gray-400 text-2xl mb-2 h-8">{equation}</div>
        <div className="text-white text-6xl font-bold break-all">{display}</div>
      </div>

      <div className="grid grid-cols-4 gap-3 flex-1">
        {buttons.flat().map((btn, i) => {
          if (!btn) return <div key={i} />;

          const isOperator = ['/', '*', '-', '+', '='].includes(btn);
          const isAction = ['C', 'DEL'].includes(btn);

          let bgColor = 'bg-gray-800';
          let textColor = 'text-white';

          if (isOperator) {
            bgColor = 'bg-yellow-400';
            textColor = 'text-black';
          } else if (isAction) {
            bgColor = 'bg-red-600';
          }

          return (
            <button
              key={i}
              onClick={() => {
                if (btn === 'C') handleClear();
                else if (btn === 'DEL') handleDelete();
                else if (btn === '=') handleCalculate();
                else handlePress(btn);
              }}
              className={`${bgColor} ${textColor} text-4xl font-bold rounded-2xl flex items-center justify-center active:scale-95 transition-transform ${
                btn === '0' ? 'col-span-2' : ''
              } ${btn === '=' ? 'row-span-2' : ''}`}
            >
              {btn}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Calculator;