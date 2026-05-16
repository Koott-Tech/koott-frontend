'use client';

import React, { useState } from 'react';

const OnboardingModal = ({ open, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const questions = [
    {
      id: 'concern',
      question: 'What brings you to therapy today?',
      options: ['Anxiety & Stress', 'Depression', 'Relationship Issues', 'Trauma', 'Self-Esteem', 'Other']
    },
    {
      id: 'experience',
      question: 'Have you been to therapy before?',
      options: ['Yes, currently in therapy', 'Yes, but not currently', 'No, this is my first time']
    },
    {
      id: 'preference',
      question: 'Do you have a preference for therapist gender?',
      options: ['No preference', 'Female therapist', 'Male therapist']
    },
    {
      id: 'language',
      question: 'What language would you prefer for therapy?',
      options: ['English', 'Hindi', 'Tamil', 'Malayalam', 'Bengali', 'Kannada']
    }
  ];

  const handleAnswer = (answer) => {
    setAnswers(prev => ({
      ...prev,
      [questions[currentStep].id]: answer
    }));
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.5)',
      zIndex: 3000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backdropFilter: 'blur(8px)'
    }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 20,
          padding: '40px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          textAlign: 'center'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Progress Bar */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{
            width: '100%',
            height: '4px',
            background: '#e1e5e9',
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${((currentStep + 1) / questions.length) * 100}%`,
              height: '100%',
              background: '#27ae60',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
            Step {currentStep + 1} of {questions.length}
          </p>
        </div>

        {/* Question */}
        <p style={{ fontWeight: 700, color: '#1a1a1a', marginBottom: '30px' }}>
          {questions[currentStep].question}
        </p>

        {/* Options */}
        <div style={{ marginBottom: '30px' }}>
          {questions[currentStep].options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswer(option)}
              style={{
                width: '100%',
                padding: '15px 20px',
                marginBottom: '10px',
                border: `2px solid ${answers[questions[currentStep].id] === option ? '#27ae60' : '#e1e5e9'}`,
                borderRadius: '12px',
                background: answers[questions[currentStep].id] === option ? '#f0f9f0' : '#fff',
                color: answers[questions[currentStep].id] === option ? '#27ae60' : '#333',
                fontSize: '16px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'left'
              }}
            >
              {option}
            </button>
          ))}
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          {currentStep > 0 && (
            <button
              onClick={handleBack}
              style={{
                padding: '12px 24px',
                border: '2px solid #e1e5e9',
                background: '#fff',
                color: '#666',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!answers[questions[currentStep].id]}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: answers[questions[currentStep].id] ? '#27ae60' : '#ccc',
              color: '#fff',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: answers[questions[currentStep].id] ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s'
            }}
          >
            {currentStep === questions.length - 1 ? 'Find My Therapist' : 'Next'}
          </button>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.9)',
            border: '1px solid #e1e5e9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default OnboardingModal;

