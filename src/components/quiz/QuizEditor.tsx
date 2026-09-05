import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Save, HelpCircle, Type, ListChecks, Plus, Copy, CheckCircle2 } from 'lucide-react';
import type { Quiz, QuizQuestion, QuestionType } from '../../types/electron.d.ts';

interface QuizEditorProps {
  initialQuiz?: Partial<Quiz>;
  onSaveQuiz: (quiz: Partial<Quiz>, questions: Partial<QuizQuestion>[]) => Promise<void>;
}

export const QuizEditor: React.FC<QuizEditorProps> = ({
  initialQuiz,
  onSaveQuiz
}) => {
  const [title, setTitle] = useState(initialQuiz?.title || 'Module Assessment');
  const [passingScore, setPassingScore] = useState(initialQuiz?.passing_score || 80);
  const [timeLimit, setTimeLimit] = useState(initialQuiz?.time_limit_minutes || 15);
  const [questions, setQuestions] = useState<Partial<QuizQuestion>[]>(() => {
    return (initialQuiz?.questions || []).map((q, idx) => ({
      ...q,
      id: q.id || `qq_${idx}_${crypto.randomUUID().slice(0, 6)}`
    }));
  });
  const [isSaving, setIsSaving] = useState(false);

  // Track the active quiz/lesson ID so parent re-renders don't reset in-progress typing
  const quizKey = initialQuiz?.id || initialQuiz?.lesson_id || '';
  const lastQuizKeyRef = useRef(quizKey);

  useEffect(() => {
    if (lastQuizKeyRef.current !== quizKey) {
      lastQuizKeyRef.current = quizKey;
      setTitle(initialQuiz?.title || 'Module Assessment');
      setPassingScore(initialQuiz?.passing_score || 80);
      setTimeLimit(initialQuiz?.time_limit_minutes || 15);
      setQuestions(
        (initialQuiz?.questions || []).map((q, idx) => ({
          ...q,
          id: q.id || `qq_${idx}_${crypto.randomUUID().slice(0, 6)}`
        }))
      );
    }
  }, [quizKey, initialQuiz]);

  const handleAddMultipleChoice = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: 'qq_' + crypto.randomUUID().slice(0, 8),
        prompt: '',
        question_type: 'multiple_choice',
        options: ['', '', '', ''],
        correct_index: 0,
        explanation: '',
        points: 1
      }
    ]);
  };

  const handleAddFillInBlank = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: 'qq_' + crypto.randomUUID().slice(0, 8),
        prompt: '',
        question_type: 'fill_blank',
        correct_answer_text: '',
        options: [],
        correct_index: 0,
        explanation: '',
        points: 1
      }
    ]);
  };

  const handleInsertMCQAfter = (index: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy.splice(index + 1, 0, {
        id: 'qq_' + crypto.randomUUID().slice(0, 8),
        prompt: '',
        question_type: 'multiple_choice',
        options: ['', '', '', ''],
        correct_index: 0,
        explanation: '',
        points: 1
      });
      return copy;
    });
  };

  const handleDuplicateQuestion = (index: number) => {
    setQuestions((prev) => {
      const qToDup = prev[index];
      if (!qToDup) return prev;
      const duplicate: Partial<QuizQuestion> = {
        ...qToDup,
        id: 'qq_' + crypto.randomUUID().slice(0, 8),
        prompt: qToDup.prompt ? `${qToDup.prompt} (Copy)` : '',
        options: qToDup.options ? [...qToDup.options] : ['', '']
      };
      const copy = [...prev];
      copy.splice(index + 1, 0, duplicate);
      return copy;
    });
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateQuestionType = (index: number, newType: QuestionType) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const curr = copy[index];
      if (newType === 'fill_blank') {
        copy[index] = {
          ...curr,
          question_type: 'fill_blank',
          correct_answer_text: curr.correct_answer_text || '',
          options: []
        };
      } else {
        copy[index] = {
          ...curr,
          question_type: 'multiple_choice',
          options: curr.options && curr.options.length >= 2 ? curr.options : ['', '', '', ''],
          correct_index: curr.correct_index ?? 0
        };
      }
      return copy;
    });
  };

  const handleUpdatePrompt = (index: number, text: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], prompt: text };
      return copy;
    });
  };

  const handleUpdateOption = (qIndex: number, optIndex: number, text: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const opts = [...(copy[qIndex].options || ['', ''])];
      opts[optIndex] = text;
      copy[qIndex] = { ...copy[qIndex], options: opts };
      return copy;
    });
  };

  const handleAddOptionToQuestion = (qIndex: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const opts = [...(copy[qIndex].options || [])];
      opts.push('');
      copy[qIndex] = { ...copy[qIndex], options: opts };
      return copy;
    });
  };

  const handleRemoveOptionFromQuestion = (qIndex: number, optIndex: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const opts = (copy[qIndex].options || []).filter((_, i) => i !== optIndex);
      let currCorrect = copy[qIndex].correct_index || 0;
      if (currCorrect >= opts.length) currCorrect = Math.max(0, opts.length - 1);
      copy[qIndex] = { ...copy[qIndex], options: opts, correct_index: currCorrect };
      return copy;
    });
  };

  const handleUpdateCorrectIndex = (qIndex: number, optIndex: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[qIndex] = { ...copy[qIndex], correct_index: optIndex };
      return copy;
    });
  };

  const handleUpdateFillAnswer = (index: number, text: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], correct_answer_text: text };
      return copy;
    });
  };

  const handleUpdateExplanation = (index: number, text: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], explanation: text };
      return copy;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveQuiz(
        {
          id: initialQuiz?.id,
          title,
          passing_score: passingScore,
          time_limit_minutes: timeLimit
        },
        questions
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Assessment Settings Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-center space-x-2 text-xs font-bold font-mono text-orange-700 uppercase">
          <HelpCircle className="w-4 h-4" />
          <span>Assessment Settings</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="col-span-1 md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Assessment Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500 font-medium select-text cursor-text"
              placeholder="e.g. Module Assessment"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Passing Score (%)</label>
            <input
              type="number"
              min={10}
              max={100}
              value={passingScore}
              onChange={(e) => setPassingScore(parseInt(e.target.value, 10) || 80)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500 font-medium select-text cursor-text"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Time Limit (Mins)</label>
            <input
              type="number"
              min={1}
              max={180}
              value={timeLimit}
              onChange={(e) => setTimeLimit(parseInt(e.target.value, 10) || 15)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500 font-medium select-text cursor-text"
            />
          </div>
        </div>
      </div>

      {/* Questions Pool Header & Top Actions */}
      <div className="space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-600">
              Questions Pool ({questions.length})
            </h4>
            <span className="text-[10px] bg-orange-100 text-orange-800 font-bold px-2 py-0.5 rounded-full">
              Google Forms Style
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleAddMultipleChoice}
              className="px-3.5 py-1.5 rounded-full bg-white border border-orange-200 hover:border-orange-400 text-orange-700 hover:bg-orange-50 text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all"
            >
              <ListChecks className="w-3.5 h-3.5 text-orange-600" />
              <span>+ Multiple Choice</span>
            </button>
            <button
              type="button"
              onClick={handleAddFillInBlank}
              className="px-3.5 py-1.5 rounded-full btn-brand-gradient text-xs font-bold text-white flex items-center space-x-1.5 shadow-sm transition-all"
            >
              <Type className="w-3.5 h-3.5" />
              <span>+ Fill-in-the-Blank</span>
            </button>
          </div>
        </div>

        {/* Question Cards List */}
        {questions.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-slate-300 rounded-2xl text-center space-y-4 bg-white shadow-sm">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="space-y-1">
              <h5 className="text-sm font-bold text-slate-800">No Assessment Questions Added Yet</h5>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Create multiple choice questions (MCQ) or fill-in-the-blank questions for this assessment unit.
              </p>
            </div>
            <div className="flex justify-center items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleAddMultipleChoice}
                className="px-5 py-2.5 rounded-full btn-brand-gradient text-xs font-bold text-white shadow-md flex items-center space-x-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Multiple Choice (MCQ)</span>
              </button>
              <button
                type="button"
                onClick={handleAddFillInBlank}
                className="px-4 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center space-x-1.5 transition-all"
              >
                <Type className="w-4 h-4 text-orange-600" />
                <span>+ Add Fill-in-Blank</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {questions.map((q, qIdx) => {
              const isFillBlank = q.question_type === 'fill_blank';
              const correctIndex = q.correct_index ?? 0;
              const options = q.options || ['', '', '', ''];
              const questionKey = q.id || `q_card_${qIdx}`;

              return (
                <div
                  key={questionKey}
                  className="p-5 bg-white border-2 border-slate-200 hover:border-orange-300 rounded-2xl space-y-4 shadow-sm transition-all"
                >
                  {/* Google Forms Question Card Header */}
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-bold font-mono text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200">
                        Question #{qIdx + 1}
                      </span>

                      {/* Question Type Switcher Dropdown */}
                      <select
                        value={q.question_type || 'multiple_choice'}
                        onChange={(e) => handleUpdateQuestionType(qIdx, e.target.value as QuestionType)}
                        className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 font-bold text-slate-700 focus:outline-none focus:border-orange-500 cursor-pointer"
                      >
                        <option value="multiple_choice">🔘 Multiple Choice</option>
                        <option value="fill_blank">✏️ Fill in the Blank</option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => handleInsertMCQAfter(qIdx)}
                        className="text-xs font-bold text-orange-600 hover:bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200 flex items-center space-x-1 transition-colors"
                        title="Insert Next MCQ Question Below"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add MCQ Below</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicateQuestion(qIdx)}
                        className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Duplicate Question"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(qIdx)}
                        className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete Question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Prompt */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">
                      {isFillBlank ? 'Statement with Blank (e.g. Extruder temperature is _______ °C):' : 'Question Prompt:'}
                    </label>
                    <input
                      type="text"
                      value={q.prompt || ''}
                      onChange={(e) => handleUpdatePrompt(qIdx, e.target.value)}
                      placeholder={isFillBlank ? 'Enter statement with blank space...' : 'Enter question prompt...'}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500 font-medium select-text cursor-text"
                    />
                  </div>

                  {/* Multiple Choice Options or Fill-in Answer */}
                  {isFillBlank ? (
                    <div className="space-y-1.5 p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                      <label className="text-xs font-bold text-emerald-900 flex items-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Correct Target Word / Answer Value *</span>
                      </label>
                      <input
                        type="text"
                        value={q.correct_answer_text || ''}
                        onChange={(e) => handleUpdateFillAnswer(qIdx, e.target.value)}
                        placeholder="Enter expected answer (e.g. 215 or 0.2mm)..."
                        className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none select-text cursor-text"
                      />
                      <p className="text-[10px] text-emerald-700">
                        Evaluated case-insensitively during grading.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-bold">Answer Choices (Select radio button for Correct Answer):</span>
                      </div>

                      <div className="space-y-2">
                        {options.map((opt, optIdx) => {
                          const isSelected = correctIndex === optIdx;
                          return (
                            <div
                              key={optIdx}
                              className={`flex items-center space-x-2.5 p-2 rounded-xl border transition-all ${
                                isSelected
                                  ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-200'
                                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <label className="flex items-center space-x-2 cursor-pointer shrink-0 pl-1">
                                <input
                                  type="radio"
                                  name={`correct_${questionKey}`}
                                  checked={isSelected}
                                  onChange={() => handleUpdateCorrectIndex(qIdx, optIdx)}
                                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                />
                                <span
                                  className={`text-xs font-mono font-bold ${
                                    isSelected ? 'text-emerald-800' : 'text-slate-500'
                                  }`}
                                >
                                  Option {String.fromCharCode(65 + optIdx)}
                                </span>
                              </label>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => handleUpdateOption(qIdx, optIdx, e.target.value)}
                                placeholder={`Option ${String.fromCharCode(65 + optIdx)} text...`}
                                className="w-full bg-transparent text-xs text-slate-900 focus:outline-none font-medium px-2 py-1 select-text cursor-text"
                              />
                              {options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOptionFromQuestion(qIdx, optIdx)}
                                  className="text-slate-400 hover:text-red-500 p-1"
                                  title="Delete Option"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}

                        {/* Google Forms style "+ Add Option" button below the last option */}
                        <div className="flex items-center space-x-2 pt-1 pl-2">
                          <div className="w-4 h-4 rounded-full border-2 border-dashed border-slate-300"></div>
                          <button
                            type="button"
                            onClick={() => handleAddOptionToQuestion(qIdx)}
                            className="text-xs font-bold text-orange-600 hover:text-orange-800 hover:underline flex items-center space-x-1 py-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Option {String.fromCharCode(65 + options.length)}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Explanation */}
                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] font-bold text-slate-700">Explanation / Engineering Feedback (Optional):</label>
                    <input
                      type="text"
                      value={q.explanation || ''}
                      onChange={(e) => handleUpdateExplanation(qIdx, e.target.value)}
                      placeholder="Optional technical rationale shown during review..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500 font-medium select-text cursor-text"
                    />
                  </div>
                </div>
              );
            })}

            {/* Google Forms Feature: Prominent "+ Add MCQ" card right below the last MCQ */}
            <div className="p-4 bg-orange-50/60 border-2 border-dashed border-orange-300 hover:border-orange-400 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors shadow-sm">
              <div className="flex items-center space-x-2 text-xs font-bold text-orange-950 font-poppins">
                <span className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center font-mono text-xs font-bold shadow-sm">
                  +{questions.length + 1}
                </span>
                <span>Add Next MCQ or Question:</span>
              </div>
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleAddMultipleChoice}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-full btn-brand-gradient text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add MCQ Question</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddFillInBlank}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-full bg-white border border-slate-200 hover:border-orange-300 text-slate-700 text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm transition-all"
                >
                  <Type className="w-4 h-4 text-orange-600" />
                  <span>+ Add Fill-in-Blank</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-7 py-3 rounded-full btn-brand-gradient text-xs font-bold flex items-center space-x-2 shadow-lg shadow-orange-500/25 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'SAVING...' : 'SAVE ASSESSMENT QUESTIONS'}</span>
        </button>
      </div>
    </div>
  );
};
