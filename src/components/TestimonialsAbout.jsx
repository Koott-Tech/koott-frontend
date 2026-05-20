"use client";
import { useState, useRef, useEffect, useMemo } from "react";

export default function TestimonialsAbout() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const scrollContainerRef = useRef(null);
    const autoPlayRef = useRef(null);

    const colors = ["#f2fff1", "#d6e4e3", "#ffe5c7", "#ffe8eb"];

    const baseTestimonials = [
        {
            quote: "Koott feels like home — warm, genuine, and full of heart. I love that we get to work closely with families and really see the difference small changes can make in a child's life.",
            author: "Fathima Liana - Consultant Psychologist"
        },
        {
            quote: "What I really love about Koott is the space it gives us to connect deeply with every child's journey. The team spirit here is amazing — we learn from each other every day.",
            author: "Anusmitha Praveen - Consultant Psychologist"
        },
        {
            quote: "Koott blends science with softness in such a beautiful way. We use solid clinical methods, but there's always warmth and creativity behind every session.",
            author: "Irene Marium - Consultant Psychologist"
        },
        {
            quote: "There's so much creativity here! From therapy games to fun tools and parent sessions — it's all about helping kids grow while keeping therapy engaging and playful.",
            author: "Athulya O - Consultant Psychologist"
        },
        {
            quote: "What I love most is how collaborative the team is. Everyone genuinely cares — we celebrate small wins together and support each other through challenges. It really feels like a family.",
            author: "Bhavith - Brand Designer"
        },
        {
            quote: "Working with Koott has been truly meaningful. It's not just about building a platform — it's about creating something that genuinely helps children and parents connect with care. Knowing our tech makes therapy easier and more accessible makes it all worth it.",
            author: "Abhishek - Software Developer"
        },
        {
            quote: "At Koott, digital marketing never feels like marketing. We're not pushing content — we're sharing stories that matter. Every campaign shows how powerful it is when empathy meets purpose, and seeing parents connect because of something we created is what keeps me inspired.",
            author: "Jishnu - Digital Marketer"
        },
        {
            quote: "Working with Koott has changed how I see storytelling. Every frame we capture holds real emotion — a child's progress, a parent's relief, a therapist's quiet pride. It's more than videos; it's documenting hope in its simplest form. I'm proud to be part of something so honest and meaningful.",
            author: "Shinas - Videographer"
        }
    ];

    // Deterministically assign colors to testimonials to prevent hydration mismatch
    // First row: #f2fff1, #d6e4e3, #ffe5c7, #ffe8eb
    // Second row: #d6e4e3, #ffe5c7, #ffe8eb, #f2fff1 (shifted by 1)
    const testimonials = useMemo(() => {
        // Fixed color patterns for each row to ensure server/client match
        const firstRowColors = ["#f2fff1", "#d6e4e3", "#ffe5c7", "#ffe8eb"];
        const secondRowColors = ["#d6e4e3", "#ffe5c7", "#ffe8eb", "#f2fff1"];
        
        return baseTestimonials.map((testimonial, index) => {
            const rowIndex = Math.floor(index / 4);
            const colorArray = rowIndex === 0 ? firstRowColors : secondRowColors;
            return {
                ...testimonial,
                bgColor: colorArray[index % colors.length]
            };
        });
    }, []);

    const nextSlide = () => {
        stopAutoPlay();
        const newSlide = (currentSlide + 1) % testimonials.length;
        setCurrentSlide(newSlide);
        scrollToSlide(newSlide);
        setTimeout(() => startAutoPlay(), 2000);
    };

    const prevSlide = () => {
        stopAutoPlay();
        const newSlide = (currentSlide - 1 + testimonials.length) % testimonials.length;
        setCurrentSlide(newSlide);
        scrollToSlide(newSlide);
        setTimeout(() => startAutoPlay(), 2000);
    };

    const goToSlide = (index) => {
        stopAutoPlay();
        setCurrentSlide(index);
        scrollToSlide(index);
        setTimeout(() => startAutoPlay(), 2000);
    };

    const handleScroll = () => {
        if (scrollContainerRef.current) {
            const scrollLeft = scrollContainerRef.current.scrollLeft;
            const cardWidth = 340; // Increased card width
            const gap = 8; // gap-2 = 8px
            const totalCardWidth = cardWidth + gap;
            const newSlide = Math.round(scrollLeft / totalCardWidth);
            setCurrentSlide(Math.min(newSlide, testimonials.length - 1));
        }
    };

    const scrollToSlide = (index) => {
        if (scrollContainerRef.current) {
            const cardWidth = 340;
            const gap = 8;
            const totalCardWidth = cardWidth + gap;
            scrollContainerRef.current.scrollTo({
                left: index * totalCardWidth,
                behavior: 'smooth'
            });
        }
    };

    const startAutoPlay = () => {
        if (autoPlayRef.current) {
            clearInterval(autoPlayRef.current);
        }
        autoPlayRef.current = setInterval(() => {
            setCurrentSlide((prev) => {
                const next = (prev + 1) % testimonials.length;
                scrollToSlide(next);
                return next;
            });
        }, 5000);
    };

    const stopAutoPlay = () => {
        if (autoPlayRef.current) {
            clearInterval(autoPlayRef.current);
            autoPlayRef.current = null;
        }
    };

    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const [touchHoldTimer, setTouchHoldTimer] = useState(null);
    const [isHolding, setIsHolding] = useState(false);
    const minSwipeDistance = 50;

    const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
        stopAutoPlay();
        
        // Start touch hold timer
        const timer = setTimeout(() => {
            setIsHolding(true);
            stopAutoPlay();
        }, 300);
        setTouchHoldTimer(timer);
    };

    const onTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
        // If moved significantly, cancel hold
        if (touchStart && Math.abs(e.targetTouches[0].clientX - touchStart) > 10) {
            if (touchHoldTimer) {
                clearTimeout(touchHoldTimer);
                setTouchHoldTimer(null);
            }
            setIsHolding(false);
        }
    };

    const onTouchEnd = () => {
        // Clear hold timer
        if (touchHoldTimer) {
            clearTimeout(touchHoldTimer);
            setTouchHoldTimer(null);
        }
        
        if (isHolding) {
            setIsHolding(false);
            // If was holding, don't swipe, just resume autoplay after delay
            setTimeout(() => {
                startAutoPlay();
            }, 3000);
            return;
        }
        
        if (!touchStart || !touchEnd) {
            setTimeout(() => {
                startAutoPlay();
            }, 3000);
            return;
        }
        
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            nextSlide();
        } else if (isRightSwipe) {
            prevSlide();
        }
        
        setTimeout(() => {
            startAutoPlay();
        }, 3000);
    };

    useEffect(() => {
        startAutoPlay();
        return () => stopAutoPlay();
    }, []);

    return (
        <div className="px-4 md:px-[50px]">
            <section className="w-full mt-10">
                <div className="min-h-[75vh] w-full rounded-2xl overflow-hidden bg-white">
                    <div className="w-full p-4 md:p-8">
                        {/* Header Section */}
                        <div className="text-center mb-8">
                            <h2 
                              className="text-[2.5rem] md:text-[3.75rem] font-medium md:font-[500] leading-[110%] md:leading-[3.975rem] tracking-[-0.125rem] md:tracking-[-0.195rem] mb-2 md:mb-4 text-center"
                            >
                              Where purpose feels real
                            </h2>
                            <p className="text-lg text-gray-600">Every story we tell, every session we take, reminds us why we started to make care feel human again.</p>
                        </div>

                        {/* Desktop: Grid Cards Layout */}
                        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-2">
                            {testimonials.map((testimonial, index) => (
                                <div key={index} className="rounded-2xl p-6 flex flex-col" style={{ backgroundColor: testimonial.bgColor }}>
                                    <p className="text-lg font-medium mb-4">"{testimonial.quote}"</p>
                                <div className="mt-auto">
                                        <p className="text-sm font-medium">{testimonial.author}</p>
                            </div>
                                </div>
                            ))}
                            </div>
                            
                        {/* Mobile: Carousel */}
                        <div className="block md:hidden w-full mt-6 mx-auto max-w-sm">
                            {/* Scrollable Carousel Container */}
                            <div 
                                ref={scrollContainerRef}
                                onScroll={handleScroll}
                                onTouchStart={onTouchStart}
                                onTouchMove={onTouchMove}
                                onTouchEnd={onTouchEnd}
                                className="relative overflow-x-auto overflow-y-hidden rounded-[10px] carousel-scroll snap-x snap-mandatory"
                                style={{ scrollSnapType: 'x mandatory' }}
                            >
                                <div className="flex gap-2 pb-4 items-stretch">
                                    {testimonials.map((testimonial, index) => (
                                        <div 
                                            key={index} 
                                            className="flex-shrink-0 w-[340px] snap-start h-[320px]"
                                        >
                                            <div className="rounded-2xl p-6 flex flex-col h-full" style={{ backgroundColor: testimonial.bgColor }}>
                                                <p className="text-lg font-medium mb-4">"{testimonial.quote}"</p>
                                <div className="mt-auto">
                                                    <p className="text-sm font-medium">{testimonial.author}</p>
                                </div>
                            </div>
                                </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Navigation Dots */}
                            <div className="flex justify-center mt-6 gap-2">
                                {testimonials.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => goToSlide(index)}
                                        className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                                            currentSlide === index ? 'bg-indigo-600' : 'bg-gray-300'
                                        }`}
                                        aria-label={`Go to slide ${index + 1}`}
                                    />
                                ))}
                            </div>
                            
                            {/* Navigation Arrows */}
                            <div className="flex justify-between items-center mt-4 px-4">
                                <button
                                    onClick={prevSlide}
                                    className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow"
                                >
                                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                            
                                <button
                                    onClick={nextSlide}
                                    className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow"
                                >
                                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
