'use client';

import React, { useState, useEffect } from "react";
import OnboardingModal from './OnboardingModal';
import { useRouter } from 'next/navigation';
import { publicApi } from '../../lib/backendApi';

const Guide = () => {
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selected, setSelected] = useState(null);
  const [doctors, setDoctors] = useState([]);
  // Modal animation state
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [isClosingDoctorModal, setIsClosingDoctorModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Fetch doctors from database
  const fetchDoctors = async () => {
    try {
      console.log('Fetching doctors...');
      setLoading(true);
      setError(null);
      const response = await publicApi.getPsychologists();
      console.log('API Response:', response);
      const psychologists = response?.data?.psychologists || [];
      console.log('Psychologists data:', psychologists);
      
      // Debug image URLs
      psychologists.forEach(psych => {
        console.log(`🔍 Frontend - Image URL for ${psych.name || psych.first_name}:`, psych.cover_image_url);
      });
      
      const assessmentEmail = (process.env.NEXT_PUBLIC_FREE_ASSESSMENT_PSYCHOLOGIST_EMAIL || 'assessment.koott@gmail.com').toLowerCase();
      const filteredPsychologists = psychologists.filter(psych => (psych.email || '').toLowerCase() !== assessmentEmail);
      setDoctors(filteredPsychologists);
    } catch (err) {
      console.error('Error fetching doctors:', err);
      setError('Failed to load doctors. Please try again later.');
      // Fallback to empty array
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch doctors on component mount
  useEffect(() => {
    fetchDoctors();
  }, []);

  // Open modal when a doctor is selected
  useEffect(() => {
    if (selected !== null && selected !== undefined) {
      setIsClosingDoctorModal(false);
      setShowDoctorModal(true);
    }
  }, [selected]);

  const closeDoctorModal = () => {
    setIsClosingDoctorModal(true);
    // Wait for exit animation before unmounting
    setTimeout(() => {
      setShowDoctorModal(false);
      setSelected(null);
    }, 220);
  };

  // Prevent background scroll when modal is open
  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      if (showDateTimePicker || showPaymentModal) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
      return () => { document.body.style.overflow = ''; };
    }
  }, [showDateTimePicker, showPaymentModal]);

  const handleBookSession = (doctor) => {
    setSelectedDoctor(doctor);
    setShowDateTimePicker(true);
  };

  const handleDoctorClick = (doctor, index) => {
    // Open modal with selected doctor for all screen sizes
    setSelected(index);
  };

  const handleDateTimeConfirm = () => {
    if (selectedDate && selectedTime) {
      setShowDateTimePicker(false);
      setShowPaymentModal(true);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSelectedDate('');
    setSelectedTime('');
    setSelectedDoctor(null);
    // Redirect to chat session or show success message
    router.push('/chat-therapy');
  };

  const handlePaymentCancel = () => {
    setShowPaymentModal(false);
    setShowDateTimePicker(true);
  };

  return (
    <div style={{ width: "100vw", minHeight: "100vh", background: "#f8fafc", overflowX: "hidden", position: "relative" }}>
      <style>{`
        @media (max-width: 768px) {
          .company-name-guide {
            display: none !important;
          }
        }
      `}</style>
      
      {/* Company name at left, aligned with navbar */}
      <div
        className="company-name-guide"
        style={{
          position: "absolute",
          top: "2.5rem",
          left: "5vw",
          zIndex: 2,
          fontWeight: 900,
          fontSize: "2.2rem",
          color: "#27ae60",
          letterSpacing: "0.05em",
          userSelect: "none",
          textShadow: "0 2px 12px rgba(39,174,96,0.08)",
          cursor: "pointer"
        }}
        onClick={() => router.push('/')}
        title="Go to homepage"
      >
        
      </div>
      
      <div style={{ position: "relative", zIndex: 3 }}></div>
      
      <section style={{ width: "100vw", minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: "8rem", paddingBottom: "4rem" }}>
        <h5 style={{ fontWeight: 800, color: "#1a1a1a", textAlign: "center", maxWidth: 900, marginBottom: "2.2rem" }}>
          Guides that help you grow
        </h5>
        <p style={{ fontSize: "1.18rem", color: "#444", textAlign: "center", maxWidth: 600, fontWeight: 500, margin: 0, marginBottom: "2.2rem" }}>
          Skilled and supportive mental health professionals dedicated to you and your wellness journey.
        </p>
        
        
        <style>{`
          .find-therapist-btn {
            position: relative;
            overflow: hidden;
            padding: 0.85rem 2.2rem;
            border-radius: 15px;
            border: none;
            background: #27ae60;
            color: #fff;
            font-weight: 700;
            font-size: 1.1rem;
            cursor: pointer;
            box-shadow: 0 6px 24px rgba(0,0,0,0.18), 0 2px 12px rgba(0,0,0,0.12);
            transition: all 0.4s cubic-bezier(.4,2,.6,1);
            z-index: 1;
          }
          .find-therapist-btn:hover {
            background: #fff;
            color: #27ae60;
            border: 2px solid #27ae60;
            transform: translateY(-2px);
            box-shadow: 0 8px 32px rgba(39,174,96,0.25), 0 4px 16px rgba(0,0,0,0.15);
          }
          .find-therapist-btn span {
            position: relative;
            z-index: 1;
          }
        `}</style>
        

        
        <OnboardingModal 
          open={showOnboarding} 
          onClose={() => setShowOnboarding(false)} 
          onComplete={() => { setShowOnboarding(false); router.push('/guide'); }} 
        />
        
        {/* Guide video cards grid - Responsive grid layout */}
        <div className="guide-cards-container">
          <style>{`
            .guide-cards-container {
              width: 100%;
              max-width: 1200px;
              margin-top: 3.2rem;
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 4px !important; /* unified row/column gap */
              padding: 0 6rem !important; /* more side padding */
              justify-items: center;
            }
            .guide-video-card {
              cursor: pointer;
              will-change: transform;
              transition: transform 0.25s cubic-bezier(.4,2,.6,1), box-shadow 0.2s;
              z-index: 1;
              width: 100%;
              max-width: 280px;
              height: 360px;
              border-radius: 10px;
              overflow: hidden;
              box-shadow: none !important;
              background: #fff;
              border: 2px solid #e0e7ef;
              position: relative;
              margin: 0 !important; /* ensure no extra row spacing */
            }
            .guide-video-card:hover {
              transform: scale(1.08) translateY(-12px);
              z-index: 10;
              box-shadow: none !important;
            }
            
            /* Medium laptop view - 4 cards per row */
            @media (min-width: 1025px) and (max-width: 1199px) {
              .guide-cards-container {
                grid-template-columns: repeat(4, 1fr);
                gap: 4px !important; /* base gap */
                row-gap: 10px !important; /* slightly larger vertical spacing */
                max-width: 1400px;
                padding: 0 5rem !important; /* more side padding */
              }
              .guide-video-card {
                max-width: 280px;
                height: 360px;
              }
              .guide-video-card:hover {
                transform: scale(1.06) translateY(-10px);
                box-shadow: none !important;
              }
            }
            
            /* Large laptop/desktop view - 4 cards per row with larger cards */
            @media (min-width: 1200px) {
              .guide-cards-container {
                grid-template-columns: repeat(4, 1fr);
                gap: 6px !important; /* base gap */
                row-gap: 12px !important; /* slightly larger vertical spacing */
                max-width: 1600px;
                padding: 0 7rem !important; /* more side padding */
              }
              .guide-video-card {
                max-width: 300px;
                height: 380px;
              }
              .guide-video-card:hover {
                transform: scale(1.08) translateY(-12px);
                box-shadow: none !important;
              }
            }
            
            /* Large tablet/small laptop view - 2 cards per row */
            @media (max-width: 1024px) and (min-width: 769px) {
              .guide-cards-container {
                grid-template-columns: repeat(2, 1fr);
                gap: 4px !important; /* unified row/column gap */
                padding: 0 4rem !important; /* more side padding */
              }
              .guide-video-card {
                max-width: 320px;
                height: 350px;
              }
              .guide-video-card:hover {
                transform: scale(1.06) translateY(-10px);
                box-shadow: none !important;
              }
            }
            
            /* Medium tablet view - 2 cards per row with smaller cards */
            @media (max-width: 900px) and (min-width: 769px) {
              .guide-cards-container {
                grid-template-columns: repeat(2, 1fr);
                gap: 4px !important; /* unified row/column gap */
                padding: 0 3rem !important; /* more side padding */
              }
              .guide-video-card {
                max-width: 280px;
                height: 330px;
              }
              .guide-video-card:hover {
                transform: scale(1.05) translateY(-8px);
                box-shadow: none !important;
              }
            }
            
            /* Mobile view - 1 card per row */
            @media (max-width: 768px) {
              .guide-cards-container {
                grid-template-columns: 1fr;
                gap: 6px !important; /* unified row/column gap */
                padding: 0 3rem !important; /* more side padding */
                max-width: 480px;
                margin-left: auto;
                margin-right: auto;
              }
              .guide-video-card {
                max-width: 100%;
                height: 460px;
                width: 100%;
              }
              .guide-video-card:hover {
                transform: scale(1.04) translateY(-8px);
                box-shadow: none !important;
              }
              /* Increase doctor name size on mobile */
              .guide-video-card .doctor-card-name {
                font-size: 1.25rem !important;
              }
            }
            
            /* Small mobile view - 1 card per row with smaller cards */
            @media (max-width: 480px) {
              .guide-cards-container {
                gap: 3px !important; /* unified row/column gap */
                padding: 0 2.5rem !important; /* more side padding */
                max-width: 420px;
              }
              .guide-video-card {
                max-width: 100%;
                height: 440px;
              }
              .guide-video-card:hover {
                transform: scale(1.03) translateY(-6px);
                box-shadow: none !important;
              }
            }
          `}</style>
          
          {loading ? (
            <div style={{
              width: "100%",
              gridColumn: "1 / -1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 200,
              color: "#666",
              fontSize: "1.2rem"
            }}>
              Loading doctors...
            </div>
          ) : error ? (
            <div style={{
              width: "100%",
              gridColumn: "1 / -1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 200,
              color: "#e74c3c",
              fontSize: "1.2rem",
              textAlign: "center"
            }}>
              {error}
            </div>
          ) : doctors.length === 0 ? (
            <div style={{
              width: "100%",
              gridColumn: "1 / -1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 200,
              color: "#666",
              fontSize: "1.2rem",
              textAlign: "center"
            }}>
              No doctors available at the moment.
            </div>
          ) : (
            doctors.map((doc, idx) => {
              return (
                <div
                  className="guide-video-card"
                  key={doc.id || doc.name || idx}
                  onClick={() => handleDoctorClick(doc, idx)}
                >
                  {/* Doctor Profile Picture or Cover Image */}
                  {(() => {
                    // First try actual image URLs from database
                    let imageSrc = doc.cover_image_url || doc.profile_picture_url;
                    
                    // If no database image, use fallback based on name
                    if (!imageSrc) {
                      const name = (doc.name || doc.first_name || '').toLowerCase();
                      if (name.includes('irene') || name.includes('marium')) {
                        imageSrc = '/irene.jpeg';
                      } else if (name.includes('doug') || name.includes('douglas')) {
                        imageSrc = '/doug.png';
                      } else if (name.includes('ashley') || name.includes('ash') || name.includes('sarah')) {
                        imageSrc = '/mainlogo.webp';
                      } else if (name.includes('child') || name.includes('teen') || name.includes('liana')) {
                        imageSrc = '/kids.png';
                      }
                    }
                    
                    console.log(`Doctor ${doc.name || doc.first_name}: imageSrc = ${imageSrc}`);
                    console.log(`Doctor ${doc.name || doc.first_name}: cover_image_url = ${doc.cover_image_url}`);
                    console.log(`Doctor ${doc.name || doc.first_name}: profile_picture_url = ${doc.profile_picture_url}`);
                    
                    if (imageSrc) {
                      return (
                        <img
                          src={imageSrc}
                          alt={`${doc.name || doc.first_name} profile`}
                          style={{ 
                            width: "100%", 
                            height: "100%", 
                            objectFit: "cover"
                          }}
                          onError={(e) => {
                            console.log(`Image failed to load for ${doc.name || doc.first_name}: ${imageSrc}`);
                            // Fallback to initials if image fails to load
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                          onLoad={() => {
                            console.log(`Image loaded successfully for ${doc.name || doc.first_name}: ${imageSrc}`);
                          }}
                        />
                      );
                    }
                    return null;
                  })()}
                  
                  {/* Gradient Overlay - Black fade from bottom to top */}
                  <div style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "45%",
                  background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.2) 75%, rgba(0,0,0,0) 100%)",
                  height: '55%',
                    pointerEvents: "none"
                  }} />
                  
                  {/* Fallback: Doctor Initials Avatar */}
                  <div 
                    style={{
                      display: (() => {
                        // Check if we have any image (database or fallback)
                        const name = (doc.name || doc.first_name || '').toLowerCase();
                        if (doc.cover_image_url || doc.profile_picture_url) return 'none';
                        if (name.includes('irene') || name.includes('marium') || 
                            name.includes('doug') || name.includes('douglas') || 
                            name.includes('ashley') || name.includes('ash') || 
                            name.includes('child') || name.includes('teen') ||
                            name.includes('sarah') || name.includes('liana')) return 'none';
                        return 'flex';
                      })(),
                      width: "100%",
                      height: "100%",
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "4rem",
                      fontWeight: "bold",
                      color: "#fff",
                      textShadow: "0 2px 8px rgba(0,0,0,0.3)"
                    }}
                  >
                    {doc.name ? 
                      doc.name.split(' ').map(n => n.charAt(0)).join('').toUpperCase() :
                      doc.first_name ? 
                        doc.first_name.charAt(0).toUpperCase() : 
                        'D'
                    }
                  </div>
                  {/* Doctor name and expertise bubbles */}
                  <div style={{
                    position: "absolute",
                    left: 18,
                    bottom: 18,
                    zIndex: 2,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 0,
                    width: "80%"
                  }}>
                    <div className="doctor-card-name" style={{ color: '#fff', fontWeight: 700, fontSize: '1.05rem', textShadow: '0 2px 8px rgba(0,0,0,0.25)', paddingLeft: 10 }}>{doc.name || 'Dr. ' + (doc.first_name || 'Unknown')}</div>
                    {/* Expertise bubbles - Personality chips only */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                      {/* Personality chips (replaces specialization) */}
                      {(() => {
                        const rawTraits = doc.personality_traits || doc.personalityTraits || doc.personalities || null;
                        let traits = [];
                        if (Array.isArray(rawTraits)) {
                          traits = rawTraits;
                        } else if (typeof rawTraits === 'string' && rawTraits.trim().length > 0) {
                          traits = rawTraits.split(/[,|/]/).map(t => t.trim()).filter(Boolean);
                        }
                        return traits.slice(0, 1).map((trait, i) => (
                          <span key={`p_${i}`} style={{ background: 'rgba(255,255,255,0.16)', color: '#fff', borderRadius: 16, padding: '0.18em 0.5em', fontWeight: 400, fontSize: '0.85rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', backdropFilter: 'blur(0.5px)', WebkitBackdropFilter: 'blur(0.5px)', border: '1.2px solid rgba(255,255,255,0.18)' }}>{trait}</span>
                        ));
                      })()}
                      {/* Price chip (matches specialization chip style) */}
                      <span style={{ background: 'rgba(255,255,255,0.22)', color: '#fff', borderRadius: 16, padding: '0.18em 0.5em', fontWeight: 400, fontSize: '0.9rem', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', backdropFilter: 'blur(0.5px)', WebkitBackdropFilter: 'blur(0.5px)', border: '1.5px solid rgba(255,255,255,0.18)' }}>{doc.price ? `₹${doc.price}` : (doc.individual_session_price ? `₹${doc.individual_session_price}` : '₹—')}</span>
                      {/* Experience chip */}
                      <span style={{
                        background: 'rgba(255,255,255,0.22)',
                        color: '#fff',
                        borderRadius: 16,
                        padding: '0.18em 0.5em',
                        fontWeight: 400,
                        fontSize: '0.9rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                        backdropFilter: 'blur(0.5px)',
                        WebkitBackdropFilter: 'blur(0.5px)',
                        border: '1.5px solid rgba(255,255,255,0.18)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <span role="img" aria-label="experience" style={{ fontSize: 14, lineHeight: 1 }}>⚡️</span>
                        {`${(doc.experience_years || 3)}+ yrs Experience`}
                      </span>
                      <span style={{
                        background: 'rgba(255,255,255,0.22)',
                        color: '#fff',
                        borderRadius: 16,
                        padding: '0.18em 0.5em',
                        fontWeight: 400,
                        fontSize: '0.9rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                        backdropFilter: 'blur(0.5px)',
                        WebkitBackdropFilter: 'blur(0.5px)',
                        border: '1.5px solid rgba(255,255,255,0.18)'
                      }}>📚 Consultant Psychologist</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Popup for Doctor Details - Hidden on mobile */}
        {showDoctorModal && (
          <div className={`doctor-modal-overlay ${isClosingDoctorModal ? 'closing' : ''}`} style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.32)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.2s"
          }}
            onClick={closeDoctorModal}
          >
            <style>{`
              .doctor-modal-overlay { opacity: 0; animation: overlayFadeIn 200ms ease forwards; }
              .doctor-modal-overlay.closing { animation: overlayFadeOut 200ms ease forwards; }
              @keyframes overlayFadeIn { from { opacity: 0; } to { opacity: 1; } }
              @keyframes overlayFadeOut { from { opacity: 1; } to { opacity: 0; } }
              @media (max-width: 768px) {
                .doctor-modal-overlay {
                  display: flex !important;
                  padding: 0 !important; /* remove outer padding including bottom */
                  align-items: flex-end; /* stick modal to bottom */
                  overflow-y: auto;
                  height: 100dvh !important; /* ensure full dynamic viewport height on mobile */
                }
              }
            `}</style>
            <div className={`doctor-modal ${isClosingDoctorModal ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>
              <style>{`
                .doctor-modal {
                  width: clamp(560px, 70vw, 900px);
                  max-width: 900px;
                  height: clamp(500px, 70vh, 680px);
                  max-height: 680px;
                  background: #fff;
                  border-radius: 10px;
                  background-clip: padding-box; /* ensure rounded corners render cleanly */
                  box-shadow: 0 12px 48px rgba(39,174,96,0.18), 0 4px 16px rgba(0,0,0,0.12);
                  display: grid;
                  grid-template-columns: 45% 55%;
                  grid-template-rows: 1fr auto;
                  gap: 2px;
                  overflow: hidden;
                  position: relative;
                  opacity: 0;
                  transform: translateY(8px) scale(0.98);
                  animation: modalIn 220ms ease forwards;
                }
                /* Responsive desktop: scale modal down gently as width shrinks */
                @media (max-width: 1200px) and (min-width: 769px) {
                  .doctor-modal {
                    width: clamp(520px, 80vw, 860px); /* allow container to shrink with viewport */
                    max-width: 860px;
                    height: clamp(480px, 68vh, 650px);
                    max-height: 650px;
                    transform: translateY(0) scale(0.98);
                  }
                  .doctor-modal-image img,
                  .doctor-modal-img {
                    object-fit: contain !important; /* avoid aggressive crop/zoom */
                  }
                }
                .doctor-modal.closing { animation: modalOut 200ms ease forwards; }
                @keyframes modalIn { 
                  from { opacity: 0; transform: translateY(8px) scale(0.98); }
                  to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes modalOut { 
                  from { opacity: 1; transform: translateY(0) scale(1); }
                  to { opacity: 0; transform: translateY(8px) scale(0.98); }
                }
                
                .doctor-modal-image {
                  flex: 1;
                  display: flex;
                  align-items: flex-start;
                  justify-content: flex-start;
                  overflow: hidden; /* clip image to container radius */
                  /* Top | Right | Bottom | Left. Further increased bottom padding */
                  padding: 12px clamp(6px, 1.2vw, 12px) clamp(24px, 5vw, 64px) 12px;
                  border-radius: 10px;
                  border-top-left-radius: 10px;
                  border-bottom-left-radius: 10px;
                  background-clip: padding-box;
                }
                .doctor-modal-image img,
                .doctor-modal-img {
                  border-radius: 10px !important; /* round all image corners to avoid sharp top-right */
                  border-top-left-radius: 10px !important;
                  border-top-right-radius: 10px !important;
                  border-bottom-left-radius: 10px !important;
                  border-bottom-right-radius: 10px !important;
                  object-fit: contain !important;
                }
                /* Ensure right panel honors top-right rounding */
                .doctor-modal-content {
                  border-top-right-radius: 10px;
                  background: #fff;
                }
                
                /* Ensure laptop view keeps image contained to avoid zoom/crop */
                @media (min-width: 1024px) {
                  .doctor-modal-image img,
                  .doctor-modal-img {
                    object-fit: contain !important;
                    object-position: left top !important; /* anchor image to top to avoid extra top whitespace */
                    border-radius: 10px !important;
                    /* Increase visual height slightly to eliminate bottom gap while keeping width */
                    height: calc(100% + 28px) !important;
                    width: auto !important;
                    max-width: none !important;
                  }
                  /* Reduce only bottom padding to remove white gap, keep top padding same */
                  .doctor-modal-image {
                    padding: 12px clamp(6px, 1.2vw, 12px) clamp(16px, 2.2vw, 28px) 12px !important;
                  }
                }
                .doctor-modal-content {
                  flex: 1;
                  padding: clamp(24px, 3.5vw, 40px) clamp(28px, 4vw, 48px) clamp(24px, 3.5vw, 40px) 12px; /* responsive top/right/bottom */
                  display: flex;
                  flex-direction: column;
                  justify-content: flex-start;
                  gap: 16px;
                  position: relative;
                  overflow-y: auto;
                  max-height: 100%;
                  /* Ensure right side respects rounded corners */
                  border-top-right-radius: 10px;
                  border-bottom-right-radius: 10px;
                  overflow: hidden; /* clip inner content to reveal radius visually */
                  background-clip: padding-box;
                }
                .doctor-modal-title {
                  font-weight: 700;
                  margin-bottom: 8px;
                  font-size: 32px !important; /* Override global h3 */
                }
                .doctor-modal-buttons {
                  display: flex;
                  flex-direction: row;
                  gap: 16px;
                  justify-content: center;
                  align-items: center;
                  margin-top: 16px;
                  flex-wrap: wrap;
                }
                .doctor-modal-button {
                  padding: 12px 24px;
                  font-size: 15px;
                  font-weight: 600;
                  border-radius: 12px;
                  cursor: pointer;
                  transition: all 0.2s;
                  min-width: 140px;
                }
                
                /* Laptop specific button adjustments */
                @media (min-width: 1024px) and (max-width: 1440px) {
                  .doctor-modal-buttons {
                    gap: 14px;
                    margin-top: 14px;
                  }
                  .doctor-modal-button {
                    padding: 11px 22px;
                    font-size: 14px;
                    min-width: 130px;
                  }
                }
                
                @media (min-width: 1441px) {
                  .doctor-modal-buttons {
                    gap: 16px;
                    margin-top: 32px;
                  }
                  .doctor-modal-button {
                    padding: 12px 24px;
                    font-size: 15px;
                    min-width: 140px;
                  }
                }
                
                /* Tablet specific styles */
                @media (min-width: 768px) and (max-width: 1180px) and (max-height: 1180px) {
                  .doctor-modal-title {
                    font-size: 28px !important; /* Tablet size */
                  }
                  .doctor-modal {
                    width: 85vw;
                    max-width: 800px;
                    height: 80vh;
                    max-height: 750px;
                  }
                  .doctor-modal-image {
                    padding: 12px clamp(6px, 1.4vw, 12px) 36px 12px; /* further increased bottom padding on tablet */
                  }
                  .doctor-modal-content {
                    padding: 32px 40px 32px 12px;
                  }
                  .doctor-modal-buttons {
                    gap: 8px;
                    margin-top: 12px;
                  }
                  .doctor-modal-button {
                    padding: 10px 18px;
                    font-size: 14px;
                    min-width: 120px;
                  }
                }
                
                /* Ensure grid layout for desktop */
                @media (min-width: 769px) {
                  .doctor-modal {
                    display: grid !important;
                    grid-template-columns: 45% 55% !important;
                    column-gap: 12px; /* add visible gap between image and text */
                  }
                  /* Make the image column span both rows so it fills full height and avoids white gap below */
                  .doctor-modal-image {
                    grid-row: 1 / span 2;
                  }
                  /* Add subtle bottom fade above buttons on right content */
                  .doctor-modal-content::after {
                    content: '';
                    position: absolute;
                    left: 0;
                    right: 0;
                    bottom: -1px;
                    height: 20px;
                    pointer-events: none;
                    background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.96));
                    z-index: 1;
                  }
                }
                
                @media (max-width: 768px) {
                  .doctor-modal {
                    position: fixed;
                    left: 0;
                    right: 0;
                    bottom: 0; /* stick to bottom */
                    width: 100vw;
                    max-width: 100vw;
                    height: auto;
                    max-height: 100dvh; /* allow full viewport height */
                    display: flex !important;
                    flex-direction: column !important;
                    grid-template-columns: none !important;
                    grid-template-rows: none !important;
                    border-radius: 10px 10px 0 0; /* bottom corners square to meet bottom edge */
                    box-shadow: none; /* remove outer shadow on mobile */
                    margin: 0 !important; /* remove outer margins */
                  }
                  .doctor-modal-image {
                    flex: none;
                    width: 100%;
                    height: 500px;
                    /* Top same as left (12px); further increased bottom padding on mobile */
                    padding: 12px clamp(6px, 2.5vw, 12px) clamp(40px, 10vw, 80px) 12px;
                    min-height: 500px;
                    overflow: hidden;
                    transform: none !important;
                    zoom: 1 !important;
                  }
                  .doctor-modal-image img,
                  .doctor-modal-img {
                    width: 100% !important;
                    height: 100% !important;
                    max-width: 100% !important;
                    max-height: 100% !important;
                    object-fit: cover !important;
                    object-position: center top !important;
                    transform: none !important;
                    zoom: 1 !important;
                    scale: 1 !important;
                    -webkit-transform: none !important;
                    -moz-transform: none !important;
                  }
                  .doctor-modal-content {
                    flex: 1;
                    padding: 24px 20px;
                    gap: 12px;
                    overflow-y: auto;
                    max-height: calc(98vh - 500px - 120px);
                  }
                  .doctor-modal-title {
                    font-size: 24px !important;
                  }
                  .doctor-modal-buttons-container {
                    gridColumn: none !important;
                    order: 3;
                    width: 100%;
                    padding: 16px 20px;
                    border-top: none;
                    margin-top: auto;
                    position: relative;
                  }
                  /* Soft fade/blur above buttons so last line looks gently faded */
                  .doctor-modal-buttons-container::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    right: 0;
                    top: -20px;
                    height: 20px;
                    pointer-events: none;
                    background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.95));
                    z-index: 1;
                  }
                  .doctor-modal-image {
                    order: 1;
                  }
                  .doctor-modal-content {
                    order: 2;
                  }
                  .doctor-modal-buttons {
                    flex-direction: row;
                    gap: 8px;
                    margin-top: 0;
                    width: 100%;
                    flex-wrap: nowrap;
                  }
                  .doctor-modal-button {
                    padding: 12px 16px;
                    font-size: 14px;
                    flex: 1;
                    min-width: 0;
                  }
                  .doctor-modal-button:first-child,
                  .doctor-modal-button:last-child {
                    flex: 0 1 auto;
                    padding: 10px 14px;
                    font-size: 18px;
                    min-width: 48px;
                    width: 48px;
                    height: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  }
                  .doctor-modal-button:first-child .button-text,
                  .doctor-modal-button:last-child .button-text {
                    display: none;
                  }
                  .doctor-modal-button:first-child .button-arrow-mobile,
                  .doctor-modal-button:last-child .button-arrow-mobile {
                    display: block;
                  }
                  .button-arrow-desktop {
                    display: none !important;
                  }
                  .doctor-modal-button:nth-child(2),
                  .find-guide-button {
                    flex: 1 1 auto;
                    padding: 14px 20px !important; /* increased mobile padding */
                    font-size: 14px;
                    min-width: 0;
                  }
                  /* Keep laptop view padding as is */
                  @media (min-width: 769px) {
                    .doctor-modal-button:nth-child(2),
                    .find-guide-button {
                      padding: 16px 120px !important; /* increased desktop padding */
                    }
                  }
                }
                /* Desktop/Laptop arrow and text behavior */
                @media (min-width: 769px) {
                  .doctor-modal-button .button-arrow-mobile {
                    display: none !important;
                  }
                  .doctor-modal-button .button-text {
                    display: inline;
                  }
                  .doctor-modal-button:first-child .button-arrow-desktop {
                    display: inline !important;
                    margin-right: 4px;
                  }
                  .doctor-modal-button:last-child .button-arrow-desktop {
                    display: inline !important;
                    margin-right: 0;
                    margin-left: 4px;
                  }
                  .doctor-modal-button:first-child,
                  .doctor-modal-button:last-child {
                    padding: 6px 0;
                    font-size: 14px;
                    min-width: auto;
                    width: auto;
                    height: auto;
                    display: inline-block;
                  }
                  /* Increase separation between side buttons and center CTA on laptop */
                  .find-guide-button {
                    margin: 0 86px !important;
                  }
                }
              `}</style>
              {/* Close X Button */}
              <button
                style={{
                  position: "absolute",
                  top: 20,
                  right: 20,
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.9)",
                  border: "2px solid #e1e5e9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  transition: "all 0.2s",
                  zIndex: 20
                }}
                onClick={closeDoctorModal}
                onMouseEnter={(e) => {
                  e.target.style.background = "rgba(255,255,255,1)";
                  e.target.style.borderColor = "#ff6b6b";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "rgba(255,255,255,0.9)";
                  e.target.style.borderColor = "#e1e5e9";
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
              
              {/* Left: Doctor Profile Picture or Cover Image */}
              <div className="doctor-modal-image" onClick={e => e.stopPropagation()}>
                {(doctors[selected]?.profile_picture_url || doctors[selected]?.cover_image_url) ? (
                  <img
                    src={doctors[selected].profile_picture_url || doctors[selected].cover_image_url}
                    alt={`${doctors[selected]?.name || doctors[selected]?.first_name} profile`}
                    className="doctor-modal-img"
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", borderRadius: "10px", transform: "none" }}
                    onError={(e) => {
                      // Fallback to initials if image fails to load
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                
                {/* Fallback: Doctor Initials Avatar */}
                <div 
                  style={{
                    display: (doctors[selected]?.profile_picture_url || doctors[selected]?.cover_image_url) ? 'none' : 'flex',
                    width: "100%",
                    height: "100%",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 หว100%)",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "8rem",
                    fontWeight: "bold",
                    color: "#fff",
                    textShadow: "0 4px 16px rgba(0,0,0,0.5)",
                    borderRadius: "10px"
                  }}
                >
                  {doctors[selected]?.name ? 
                    doctors[selected].name.split(' ').map(n => n.charAt(0)).join('').toUpperCase() :
                    doctors[selected]?.first_name ? 
                      doctors[selected].first_name.charAt(0).toUpperCase() : 
                      'D'
                  }
                </div>
              </div>
              
              {/* Right: Details - Only name, years of experience, price, and description */}
              <div className="doctor-modal-content" onClick={e => e.stopPropagation()}>
                <h3 className="doctor-modal-title" style={{ lineHeight: 1.1, fontWeight: 400, margin: 0, color: '#111', marginBottom: 4 }}>
                  {doctors[selected]?.name || 'Dr. ' + (doctors[selected]?.first_name || 'Unknown')}
                </h3>
                
                {/* Experience + Price grouped to remove container column gap */}
                {(doctors[selected]?.experience_years || doctors[selected]?.price) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: -4 }}>
                    {doctors[selected]?.experience_years && (
                      <h6 style={{ margin: 0, lineHeight: '1.2' }}>
                        {doctors[selected].experience_years} {doctors[selected].experience_years === 1 ? 'year' : 'years'} of experience
                      </h6>
                    )}
                    {doctors[selected]?.price && (
                      <h6 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12, lineHeight: '1.2' }}>
                        <span>Starting from</span>
                        <span style={{ color: "#27ae60" }}>₹{doctors[selected].price}</span>
                      </h6>
                    )}
                  </div>
                )}
                
                {/* Specialization (replaces Personality in modal) */}
                {(() => {
                  const expertiseArray = doctors[selected]?.area_of_expertise && Array.isArray(doctors[selected].area_of_expertise) && doctors[selected].area_of_expertise.length > 0 
                    ? doctors[selected].area_of_expertise 
                    : [];

                  return expertiseArray.length > 0 ? (
                    <div style={{ marginBottom: 8, marginTop: 8 }}>
                      <h6 style={{ marginBottom: 8, marginTop: 0, fontWeight: 600 }}>Specialization</h6>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {expertiseArray.map((spec, i) => (
                          <span key={i} style={{ 
                            background: '#f0f0f0', 
                            color: '#333', 
                            padding: '4px 12px', 
                            borderRadius: '16px', 
                            fontSize: '14px',
                            fontWeight: 400
                          }}>
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
                
                {/* Description */}
                <p style={{ marginBottom: 8, marginTop: 0, lineHeight: '1.2' }}>
                  {doctors[selected]?.description || "This clinician is passionate about helping people make progress through evidence-based support and compassionate guidance."}
                </p>
                
              </div>
              
              {/* Bottom Actions - Below both components */}
              <div className="doctor-modal-buttons-container" style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '16px 24px' }}>
                <button
                  className="doctor-modal-button"
                  style={{ background: 'transparent', border: 'none', color: '#666', fontWeight: 600, fontSize: '14px', padding: '6px 0', cursor: 'pointer' }}
                  onClick={() => {
                    const prevIndex = selected === 0 ? doctors.length - 1 : selected - 1;
                    setSelected(prevIndex);
                  }}
                >
                  <span className="button-arrow-desktop">&lt;</span>
                  <span className="button-text">{`Meet ${doctors[(selected === 0 ? doctors.length - 1 : selected - 1)]?.name?.split(' ')[0] || doctors[(selected === 0 ? doctors.length - 1 : selected - 1)]?.first_name || 'Prev'}`}</span>
                  <span className="button-arrow-mobile">&lt;</span>
                </button>

                <button
                  className="doctor-modal-button find-guide-button"
                  style={{ background: '#0a7f3f', color: '#fff', border: 'none', borderRadius: 14, padding: '16px 120px', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
                  onClick={() => {
                    const doctor = doctors[selected];
                    if (doctor) {
                      // Create URL-friendly slug from doctor name or use ID
                      if (doctor) {
                        const name = doctor.name || `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim();
                        if (name) {
                          const slug = name
                        .toLowerCase()
                        .trim()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-+|-+$/g, '');
                          router.push(`/online-child-psychologist/${slug}`);
                        }
                      }
                    }
                  }}
                >
                  Find your Guide
                </button>

                <button
                  className="doctor-modal-button"
                  style={{ background: 'transparent', border: 'none', color: '#666', fontWeight: 600, fontSize: '14px', padding: '6px 0', cursor: 'pointer' }}
                  onClick={() => {
                    const nextIndex = selected === doctors.length - 1 ? 0 : selected + 1;
                    setSelected(nextIndex);
                  }}
                >
                  <span className="button-text">{`Meet ${doctors[(selected === doctors.length - 1 ? 0 : selected + 1)]?.name?.split(' ')[0] || doctors[(selected === doctors.length - 1 ? 0 : selected + 1)]?.first_name || 'Next'}`}</span>
                  <span className="button-arrow-desktop">&gt;</span>
                  <span className="button-arrow-mobile">&gt;</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Date/Time Picker Modal */}
        {showDateTimePicker && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.5)",
            zIndex: 3000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(8px)"
          }}
            onClick={() => setShowDateTimePicker(false)}
          >
            <div className="datetime-modal">
              <style>{`
                .datetime-modal {
                  background: #fff;
                  border-radius: 20px;
                  padding: 30px;
                  max-width: 450px;
                  width: 90%;
                  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
                  text-align: center;
                }
                .datetime-modal-title {
                  font-weight: 700;
                  color: #1a1a1a;
                  margin-bottom: 20px;
                }
                .datetime-modal-buttons {
                  display: flex;
                  gap: 15px;
                  justify-content: center;
                }
                .datetime-modal-button {
                  padding: 12px 24px;
                  font-size: 16px;
                  font-weight: 600;
                  border-radius: 12px;
                  cursor: pointer;
                  transition: all 0.2s;
                }
                @media (max-width: 768px) {
                  .datetime-modal {
                    padding: 20px;
                    max-width: 95%;
                    max-height: 90vh;
                    overflow-y: auto;
                  }
                  .datetime-modal-buttons {
                    flex-direction: column;
                  }
                  .datetime-modal-button {
                    padding: 14px 20px;
                    font-size: 16px;
                    width: 100%;
                  }
                }
              `}</style>
              <p className="datetime-modal-title">
                Book Session with {selectedDoctor?.name}
              </p>
              
              {/* Calendar Header */}
              <div style={{ textAlign: "center", marginBottom: "15px" }}>
                <p style={{ fontWeight: 700, color: "#333", marginBottom: "3px" }}>Select Date & Time</p>
                <p style={{ fontSize: "12px", color: "#666" }}>Choose a date and time that works for you</p>
              </div>
              
              {/* Calendar Grid */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(7, 1fr)", 
                  gap: "2px", 
                  marginBottom: "12px" 
                }}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                    <div key={`header-${index}`} style={{ 
                      textAlign: "center", 
                      fontSize: "10px", 
                      fontWeight: 600, 
                      color: "#666", 
                      padding: "4px 2px" 
                    }}>
                      {day}
                    </div>
                  ))}
                  {Array.from({ length: 35 }, (_, i) => {
                    const day = i + 1;
                    const isAvailable = day >= 15 && day <= 25;
                    const isSelected = selectedDate && new Date(selectedDate).getDate() === day;
                    return (
                      <div
                        key={`day-${day}`}
                        onClick={() => {
                          if (isAvailable) {
                            const today = new Date();
                            const selectedDay = new Date(today.getFullYear(), today.getMonth(), day);
                            setSelectedDate(selectedDay.toISOString().split('T')[0]);
                          }
                        }}
                        style={{
                          textAlign: "center",
                          padding: "4px 2px",
                          borderRadius: "4px",
                          cursor: isAvailable ? "pointer" : "default",
                          transition: "all 0.2s",
                          fontSize: "11px",
                          fontWeight: 500,
                          backgroundColor: isSelected ? "#27ae60" : "transparent",
                          color: isSelected ? "#fff" : isAvailable ? "#333" : "#ccc",
                          border: isSelected ? "none" : "1px solid transparent"
                        }}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Time Slots */}
              <div style={{ marginBottom: "20px" }}>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#333", marginBottom: "8px", textAlign: "left" }}>
                  Available Times
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px" }}>
                  {['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'].map((time) => {
                    const timeValue = time === '9:00 AM' ? '09:00' : 
                                    time === '10:00 AM' ? '10:00' : 
                                    time === '11:00 AM' ? '11:00' : 
                                    time === '12:00 PM' ? '12:00' : 
                                    time === '2:00 PM' ? '14:00' : 
                                    time === '3:00 PM' ? '15:00' : 
                                    time === '4:00 PM' ? '16:00' : '17:00';
                    const isSelected = selectedTime === timeValue;
                    return (
                      <div
                        key={time}
                        onClick={() => setSelectedTime(timeValue)}
                        style={{
                          padding: "8px 6px",
                          borderRadius: "6px",
                          border: `2px solid ${isSelected ? "#27ae60" : "#e1e5e9"}`,
                          cursor: "pointer",
                          transition: "all 0.2s",
                          fontSize: "12px",
                          fontWeight: 500,
                          backgroundColor: isSelected ? "#f0f9f0" : "transparent",
                          color: isSelected ? "#27ae60" : "#333",
                          textAlign: "center"
                        }}
                      >
                        {time}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="datetime-modal-buttons">
                <button
                  className="datetime-modal-button"
                  onClick={() => setShowDateTimePicker(false)}
                  style={{
                    border: "2px solid #e1e5e9",
                    background: "#fff",
                    color: "#666"
                  }}
                >
                  Cancel
                </button>
                <button
                  className="datetime-modal-button"
                  onClick={handleDateTimeConfirm}
                  disabled={!selectedDate || !selectedTime}
                  style={{
                    border: "none",
                    background: selectedDate && selectedTime ? "#27ae60" : "#ccc",
                    color: "#fff",
                    cursor: selectedDate && selectedTime ? "pointer" : "not-allowed"
                  }}
                >
                  Continue to Payment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.5)",
            zIndex: 3000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(8px)"
          }}
            onClick={() => setShowPaymentModal(false)}
          >
            <div className="payment-modal">
              <style>{`
                .payment-modal {
                  background: #fff;
                  border-radius: 20px;
                  padding: 40px;
                  max-width: 500px;
                  width: 90%;
                  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
                  text-align: center;
                }
                .payment-modal-title {
                  font-weight: 700;
                  color: #1a1a1a;
                  margin-bottom: 20px;
                }
                .payment-modal-buttons {
                  display: flex;
                  gap: 15px;
                  justify-content: center;
                }
                .payment-modal-button {
                  padding: 12px 24px;
                  font-size: 16px;
                  font-weight: 600;
                  border-radius: 12px;
                  cursor: pointer;
                  transition: all 0.2s;
                }
                @media (max-width: 768px) {
                  .payment-modal {
                    padding: 20px;
                    max-width: 95%;
                    max-height: 90vh;
                    overflow-y: auto;
                  }
                  .payment-modal-buttons {
                    flex-direction: column;
                  }
                  .payment-modal-button {
                    padding: 14px 20px;
                    font-size: 16px;
                    width: 100%;
                  }
                }
              `}</style>
              <div onClick={e => e.stopPropagation()}>
              <p className="payment-modal-title">
                Complete Your Booking
              </p>
              
              <div style={{ 
                background: "#f8f9fa", 
                borderRadius: "12px", 
                padding: "20px", 
                marginBottom: "30px",
                textAlign: "left"
              }}>
                <p style={{ fontWeight: 600, color: "#333", marginBottom: "15px" }}>
                  Session Details:
                </p>
                <div style={{ fontSize: "16px", color: "#666", lineHeight: "1.6" }}>
                  <p><strong>Doctor:</strong> {selectedDoctor?.name}</p>
                  <p><strong>Date:</strong> {selectedDate}</p>
                  <p><strong>Time:</strong> {selectedTime}</p>
                  <p><strong>Duration:</strong> 30 minutes</p>
                  <p><strong>Price:</strong> ₹100</p>
                </div>
              </div>

              <div style={{ marginBottom: "30px" }}>
                <p style={{ fontWeight: 600, color: "#333", marginBottom: "15px" }}>
                  Payment Method:
                </p>
                <div style={{ 
                  border: "2px solid #e1e5e9", 
                  borderRadius: "12px", 
                  padding: "15px",
                  background: "#f8f9fa"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <input type="radio" id="card" name="payment" defaultChecked style={{ transform: "scale(1.2)" }} />
                    <label htmlFor="card" style={{ fontSize: "16px", color: "#333" }}>
                      Credit/Debit Card
                    </label>
                  </div>
                </div>
              </div>

              <div className="payment-modal-buttons">
                <button
                  className="payment-modal-button"
                  onClick={handlePaymentCancel}
                  style={{
                    border: "2px solid #e1e5e9",
                    background: "#fff",
                    color: "#666"
                  }}
                >
                  Back
                </button>
                <button
                  className="payment-modal-button"
                  onClick={handlePaymentSuccess}
                  style={{
                    border: "none",
                    background: "#27ae60",
                    color: "#fff"
                  }}
                >
                  Pay ₹100
                </button>
              </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default Guide;
