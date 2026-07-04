"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/backendApi';
import HeroSection from '@/components/HeroSection';
import LogosStrip from '@/components/LogosStrip';
import HowItWorks from '@/components/HowItWorks';
import BenefitsSection from '@/components/BenefitsSection';
import TherapyTypesSplit from '@/components/TherapyTypesSplit';
import InfoCards from '@/components/InfoCards';
import HelpFaq from '@/components/HelpFaq';
import VideosShowcase from '@/components/VideosShowcase';
import Reviews from '@/components/Reviews';
import BlogTeaser from '@/components/BlogTeaser';
import ImageUpload from '@/components/ImageUpload';
import TherapistCarousel from '@/components/TherapistCarousel';
import { publicApi } from '@/lib/backendApi';
import { normalizeImageUrl } from '@/utils/urlNormalizer';

const normalizeInfoCards = (cards = []) => {
  if (!Array.isArray(cards)) return [];
  return cards.map((card) => {
    const linkValue = card?.ctaLink || card?.link || '';
    return {
      ...card,
      ctaLink: linkValue,
      link: linkValue,
    };
  });
};

export default function AssessmentsPageBuilder({ 
  serviceId, 
  assessmentId,
  initialData = null, 
  onSubmit, 
  onCancel, 
  loading = false 
}) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    slug: '',
    status: 'draft',
    category: '',
    menu_order: 0,
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
    og_title: '',
    og_description: '',
    og_image: '',
    canonical_url: '',
    robots: 'index,follow',
    schema_enabled: true,
    schema_service_type: '',
    hero_title: '',
    hero_subtext: '',
    hero_cta_text: '',
    hero_image_url: '',
    hero_point_1: '',
    hero_point_2: '',
    hero_point_3: '',
    therapists_heading: '',
    benefits: [],
    types: [],
    types_title: '',
    faqs: [],
    benefits_title: '',
    benefits_image_url: '',
    right_image_url: '',
    mobile_image_url: '',
    condition_boxes: [
      { title: 'ADHD', description: 'Support for attention and focus challenges', link: '/assessments/adhd-vanderbilt' },
      { title: 'Anxiety', description: 'Help managing worry and stress', link: '/assessments/spence-anxiety-scale' },
      { title: 'Depression', description: 'Support for mood and emotional wellbeing', link: '/assessments/child-depression-inventory' }
    ],
    info_cards: normalizeInfoCards([
      { icon: 'speech-bubble', iconColor: 'purple', title: "Find licensed therapist to support your child's bigger emotions", description: "Child therapy provides a safe and nurturing space where children can express their feelings, build coping skills, and navigate challenges like anxiety, behavior issues, or school stress.", cta: 'Find a therapist', ctaLink: '/counselling', link: '/counselling' },
      { icon: 'pill', iconColor: 'green', title: "Get clarity with experts for your child's needs and strengths", description: "Understanding your child’s strengths and challenges is the key to giving the right support. Child Assessments help identify learning, attention, or emotional concerns like ADHD or autism.", cta: 'Book an assessment', ctaLink: '/assessments', link: '/assessments' },
      { icon: 'combination', iconColor: 'blue', title: "Learn strategies and tools to be a better parent that you always wanted to be", description: "Parenting doesn’t come with a manual—but with supportive parenting counseling, you can learn effective ways to manage behaviour, communicate better, and understand your child’s emotions.", cta: 'Start parent coaching', ctaLink: '/better-parenting', link: '/better-parenting' }
    ]),
    videos: [],
    reviews: [],
    assigned_doctor_ids: [],
    allow_cash_payment: false,
  });

  const [activeElement, setActiveElement] = useState(null);
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [therapists, setTherapists] = useState([]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        slug: initialData.slug || '',
        status: initialData.status || 'draft',
        category: initialData.category || '',
        menu_order: initialData.menu_order || 0,
        seo_title: initialData.seo_title || '',
        seo_description: initialData.seo_description || '',
        seo_keywords: initialData.seo_keywords || '',
        og_title: initialData.og_title || '',
        og_description: initialData.og_description || '',
        og_image: initialData.og_image || '',
        canonical_url: initialData.canonical_url || '',
        robots: initialData.robots || 'index,follow',
        schema_enabled: initialData.schema_enabled !== false,
        schema_service_type: initialData.schema_service_type || '',
        hero_title: initialData.hero_title || '',
        hero_subtext: initialData.hero_subtext || '',
        hero_cta_text: initialData.hero_cta_text || '',
        hero_image_url: initialData.hero_image_url || '',
      hero_point_1: initialData.hero_point_1 || '',
      hero_point_2: initialData.hero_point_2 || '',
      hero_point_3: initialData.hero_point_3 || '',
        therapists_heading: initialData.therapists_heading || '',
        benefits: initialData.benefits || [],
        types: initialData.types || [],
        types_title: initialData.types_title || '',
        faqs: initialData.faqs || [],
        benefits_title: initialData.benefits_title || '',
        benefits_image_url: initialData.benefits_image_url || '',
        right_image_url: initialData.right_image_url || '',
        left_image_url: initialData.left_image_url || '',
        mobile_image_url: initialData.mobile_image_url || '',
        condition_boxes: initialData.condition_boxes || [
          { title: 'ADHD', description: 'Support for attention and focus challenges', link: '/assessments/adhd-vanderbilt' },
          { title: 'Anxiety', description: 'Help managing worry and stress', link: '/assessments/spence-anxiety-scale' },
          { title: 'Depression', description: 'Support for mood and emotional wellbeing', link: '/assessments/child-depression-inventory' }
        ],
        info_cards: normalizeInfoCards(initialData.info_cards || [
          { icon: 'speech-bubble', iconColor: 'purple', title: "Find licensed therapist to support your child's bigger emotions", description: "Child therapy provides a safe and nurturing space where children can express their feelings, build coping skills, and navigate challenges like anxiety, behavior issues, or school stress.", cta: 'Find a therapist', ctaLink: '/counselling', link: '/counselling' },
          { icon: 'pill', iconColor: 'green', title: "Get clarity with experts for your child's needs and strengths", description: "Understanding your child’s strengths and challenges is the key to giving the right support. Child Assessments help identify learning, attention, or emotional concerns like ADHD or autism.", cta: 'Book an assessment', ctaLink: '/assessments', link: '/assessments' },
          { icon: 'combination', iconColor: 'blue', title: "Learn strategies and tools to be a better parent that you always wanted to be", description: "Parenting doesn’t come with a manual—but with supportive parenting counseling, you can learn effective ways to manage behaviour, communicate better, and understand your child’s emotions.", cta: 'Start parent coaching', ctaLink: '/better-parenting', link: '/better-parenting' }
        ]),
        videos: initialData.videos || [],
        reviews: initialData.reviews || [],
        assigned_doctor_ids: initialData.assigned_doctor_ids || [],
        allow_cash_payment: initialData.allow_cash_payment || false,
      });
    }
  }, [initialData]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await publicApi.getPsychologists();
        const list = data?.data?.psychologists || [];
        if (mounted) setTherapists(list); // Load ALL therapists, not just first 6
      } catch (_) {}
    })();
    return () => { mounted = false; };
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const slugify = (val) => {
    return (val || '')
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleArrayItemAdd = (field) => {
    const newItem = field === 'benefits'
      ? { title: '', description: '', iconUrl: '' }
      : field === 'types'
        ? { title: '', description: '' }
        : field === 'faqs'
          ? { question: '', answer: '' }
          : field === 'videos'
            ? { title: '', url: '', thumbnailUrl: '' }
            : field === 'reviews'
              ? { author: '', text: '' }
              : field === 'info_cards'
                ? { title: '', description: '', icon: '', iconColor: '', cta: '', ctaLink: '', link: '' }
                : { title: '', description: '' };
    
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], newItem]
    }));
  };

  const handleArrayItemUpdate = (field, index, itemField, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => 
        i === index ? { ...item, [itemField]: value } : item
      )
    }));
  };

  const handleArrayItemRemove = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleElementClick = (elementType, elementData = {}) => {
    setActiveElement({ type: elementType, data: elementData });
  };

  const handleSave = () => {
    const isEdit = !!(serviceId || assessmentId);
    const normalizedSlug = slugify(formData.slug || '');
    const heroTitle = (formData.hero_title || '').trim();

    if (!heroTitle) {
      alert('Please fill Hero Title before saving.');
      return;
    }

    if (!isEdit && !normalizedSlug) {
      alert('Please fill Slug before saving.');
      return;
    }

    const dataToSave = {
      ...formData,
      info_cards: normalizeInfoCards(formData.info_cards)
    };

    if (isEdit) {
      delete dataToSave.slug;
    } else {
      dataToSave.slug = normalizedSlug;
      if (normalizedSlug !== formData.slug) {
        setFormData(prev => ({ ...prev, slug: normalizedSlug }));
    }
    }

    onSubmit(dataToSave);
  };

  const renderEditableElement = (elementType, children, elementData = {}) => {
    return (
      <div 
        className={`relative group ${isPreviewMode ? 'hover:ring-2 hover:ring-blue-500 hover:ring-opacity-50' : ''}`}
        onClick={() => isPreviewMode && handleElementClick(elementType, elementData)}
      >
        {children}
        {isPreviewMode && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-blue-500 text-white px-2 py-1 rounded text-xs">
              Click to edit
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderElementEditor = () => {
    if (!activeElement) return null;

    switch (activeElement.type) {
      case 'hero':
        return (
          <div className="space-y-3 md:space-y-4">
            <h3 className="text-base md:text-lg font-semibold">Edit Hero Section</h3>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                Hero Title
              </label>
              <input
                type="text"
                value={formData.hero_title}
                onChange={(e) => handleInputChange('hero_title', e.target.value)}
                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                Hero Subtext
              </label>
              <textarea
                value={formData.hero_subtext}
                onChange={(e) => handleInputChange('hero_subtext', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                Hero CTA Text (e.g., "Start Child Anxiety Counselling Online Today")
              </label>
              <input
                type="text"
                value={formData.hero_cta_text}
                onChange={(e) => handleInputChange('hero_cta_text', e.target.value)}
                placeholder="Optional: Add a call-to-action text below the features"
                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Hero Bullet 1</label>
              <input
                type="text"
                value={formData.hero_point_1}
                onChange={(e) => handleInputChange('hero_point_1', e.target.value)}
                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Hero Bullet 2</label>
              <input
                type="text"
                value={formData.hero_point_2}
                onChange={(e) => handleInputChange('hero_point_2', e.target.value)}
                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Hero Bullet 3</label>
              <input
                type="text"
                value={formData.hero_point_3}
                onChange={(e) => handleInputChange('hero_point_3', e.target.value)}
                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <ImageUpload
              currentImageUrl={formData.hero_image_url}
              onImageUpload={(url) => handleInputChange('hero_image_url', url)}
              imageType="hero"
              slug={formData.slug}
              label="Hero Image"
            />
          </div>
        );
      case 'therapists':
        return (
          <div className="space-y-3 md:space-y-4">
            <h3 className="text-base md:text-lg font-semibold">Edit Therapists Section</h3>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                Therapists Heading (appears above doctor cards)
              </label>
              <input
                type="text"
                value={formData.therapists_heading}
                onChange={(e) => handleInputChange('therapists_heading', e.target.value)}
                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your journey to a happier, calmer home begins here."
              />
            </div>
          </div>
        );

      case 'benefits':
        return (
          <div className="space-y-3 md:space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h3 className="text-base md:text-lg font-semibold">Edit Benefits</h3>
              <button
                onClick={() => handleArrayItemAdd('benefits')}
                className="bg-blue-500 text-white px-3 py-1 rounded text-xs md:text-sm hover:bg-blue-600 whitespace-nowrap"
              >
                Add Benefit
              </button>
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                Section Title (e.g., "Understanding Worry and Anxiety in Kids")
              </label>
              <input
                type="text"
                value={formData.benefits_title}
                onChange={(e) => handleInputChange('benefits_title', e.target.value)}
                placeholder="Benefits Section Title"
                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mt-4">
              <ImageUpload
                currentImageUrl={formData.benefits_image_url}
                onImageUpload={(url) => handleInputChange('benefits_image_url', url)}
                imageType="benefits"
                slug={formData.slug}
                label="Benefits Section Image"
              />
            </div>
            {formData.benefits.map((benefit, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3 md:p-4">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-sm md:text-base font-medium">Benefit {index + 1}</h4>
                  <button
                    onClick={() => handleArrayItemRemove('benefits', index)}
                    className="text-red-600 hover:text-red-800 text-xs md:text-sm"
                  >
                    Remove
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={benefit.title}
                      onChange={(e) => handleArrayItemUpdate('benefits', index, 'title', e.target.value)}
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                      Icon URL
                    </label>
                    <input
                      type="url"
                      value={benefit.iconUrl}
                      onChange={(e) => handleArrayItemUpdate('benefits', index, 'iconUrl', e.target.value)}
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={benefit.description}
                      onChange={(e) => handleArrayItemUpdate('benefits', index, 'description', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'types':
        return (
          <div className="space-y-3 md:space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h3 className="text-base md:text-lg font-semibold">Edit Therapy Types</h3>
              <button
                onClick={() => handleArrayItemAdd('types')}
                className="bg-blue-500 text-white px-3 py-1 rounded text-xs md:text-sm hover:bg-blue-600 whitespace-nowrap"
              >
                Add Type
              </button>
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                Section Title
              </label>
              <input
                type="text"
                value={formData.types_title}
                onChange={(e) => handleInputChange('types_title', e.target.value)}
                placeholder="e.g., Types of Therapy"
                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mt-4">
              <ImageUpload
                currentImageUrl={formData.right_image_url}
                onImageUpload={(url) => handleInputChange('right_image_url', url)}
                imageType="types"
                slug={formData.slug}
                label="Types Section Image"
              />
            </div>
            {formData.types.map((type, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3 md:p-4">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-sm md:text-base font-medium">Type {index + 1}</h4>
                  <button
                    onClick={() => handleArrayItemRemove('types', index)}
                    className="text-red-600 hover:text-red-800 text-xs md:text-sm"
                  >
                    Remove
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={type.title}
                      onChange={(e) => handleArrayItemUpdate('types', index, 'title', e.target.value)}
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={type.description}
                      onChange={(e) => handleArrayItemUpdate('types', index, 'description', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'condition_boxes':
        return (
          <div className="space-y-3 md:space-y-4">
            <h3 className="text-base md:text-lg font-semibold">Edit Condition Boxes</h3>
            {formData.condition_boxes.map((box, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3 md:p-4">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-sm md:text-base font-medium">Box {index + 1}</h4>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={box.title}
                      onChange={(e) => handleArrayItemUpdate('condition_boxes', index, 'title', e.target.value)}
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={box.description}
                      onChange={(e) => handleArrayItemUpdate('condition_boxes', index, 'description', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                      Link URL
                    </label>
                    <input
                      type="text"
                      value={box.link}
                      onChange={(e) => handleArrayItemUpdate('condition_boxes', index, 'link', e.target.value)}
                      placeholder="e.g., /assessments/spence-anxiety-scale"
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      case 'info_cards':
        return (
          <div className="space-y-3 md:space-y-4">
            <h3 className="text-base md:text-lg font-semibold">Edit Info Cards</h3>
            {(formData.info_cards || []).map((card, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3 md:p-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input type="text" value={card.title} onChange={(e)=>handleArrayItemUpdate('info_cards', index, 'title', e.target.value)} className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea value={card.description} onChange={(e)=>handleArrayItemUpdate('info_cards', index, 'description', e.target.value)} rows={3} className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Icon</label>
                    <select
                      value={card.icon || ''}
                      onChange={(e)=>handleArrayItemUpdate('info_cards', index, 'icon', e.target.value)}
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">None</option>
                      <option value="speech-bubble">Speech bubble</option>
                      <option value="pill">Pill</option>
                      <option value="combination">Combination</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Icon Color</label>
                    <select
                      value={card.iconColor || ''}
                      onChange={(e)=>handleArrayItemUpdate('info_cards', index, 'iconColor', e.target.value)}
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Default</option>
                      <option value="purple">Purple</option>
                      <option value="green">Green</option>
                      <option value="blue">Blue</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">CTA</label>
                    <input type="text" value={card.cta} onChange={(e)=>handleArrayItemUpdate('info_cards', index, 'cta', e.target.value)} className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">CTA Link (URL)</label>
                    <input
                      type="text"
                      placeholder="e.g., /assessments or /assessments/adhd"
                      value={card.ctaLink || card.link || ''}
                      onChange={(e) => {
                        handleArrayItemUpdate('info_cards', index, 'ctaLink', e.target.value);
                        handleArrayItemUpdate('info_cards', index, 'link', e.target.value);
                      }}
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Used as anchor href for the button</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'faqs':
        return (
          <div className="space-y-3 md:space-y-4">
            <div>
              <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Edit FAQs</h3>
              
              {/* All FAQs (up to 8) - No section headings for CMS pages */}
              <div className="mb-4 md:mb-6">
                <p className="text-xs md:text-sm text-gray-600 mb-3">Add up to 8 FAQs (no section headings will be shown)</p>
                {formData.faqs.slice(0, 8).map((faq, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3 md:p-4 mb-3">
                    <div className="flex justify-between items-start mb-3">
                      <h5 className="text-sm md:text-base font-medium">FAQ {index + 1}</h5>
                      <button
                        onClick={() => handleArrayItemRemove('faqs', index)}
                        className="text-red-600 hover:text-red-800 text-xs md:text-sm"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                          Question
                        </label>
                        <input
                          type="text"
                          value={faq.question}
                          onChange={(e) => handleArrayItemUpdate('faqs', index, 'question', e.target.value)}
                          className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                          Answer
                        </label>
                        <textarea
                          value={faq.answer}
                          onChange={(e) => handleArrayItemUpdate('faqs', index, 'answer', e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {formData.faqs.length >= 8 && (
                  <p className="text-xs md:text-sm text-gray-500 mt-2">Maximum 8 FAQs allowed</p>
                )}
              </div>

              {formData.faqs.length < 8 && (
                <button
                  onClick={() => handleArrayItemAdd('faqs')}
                  className="bg-blue-500 text-white px-4 py-2 rounded text-xs md:text-sm hover:bg-blue-600"
                >
                  Add FAQ
                </button>
              )}
              {formData.faqs.length >= 8 && (
                <p className="text-xs md:text-sm text-gray-500">Maximum 8 FAQs reached</p>
              )}
            </div>
          </div>
        );


      case 'videos':
        return (
          <div className="space-y-3 md:space-y-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-base md:text-lg font-semibold">Video Reviews</h3>
              <button onClick={() => handleArrayItemAdd('videos')} className="bg-blue-500 text-white px-3 py-1 rounded text-xs md:text-sm hover:bg-blue-600">Add Video</button>
            </div>
            {(formData.videos || []).map((video, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-3 md:p-4">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-sm md:text-base font-medium">Video {i + 1}</h4>
                  <button onClick={() => handleArrayItemRemove('videos', i)} className="text-red-600 hover:text-red-800 text-xs md:text-sm">Remove</button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input type="text" value={video.title || ''} onChange={(e)=>handleArrayItemUpdate('videos', i, 'title', e.target.value)} className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Video URL</label>
                    <input type="text" placeholder="https://... (YouTube/Vimeo/MP4)" value={video.url || ''} onChange={(e)=>handleArrayItemUpdate('videos', i, 'url', e.target.value)} className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <ImageUpload currentImageUrl={video.thumbnailUrl || ''} onImageUpload={(url) => handleArrayItemUpdate('videos', i, 'thumbnailUrl', url)} imageType="video-thumb" slug={formData.slug} label="Thumbnail Image" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Position (0-4)</label>
                    <select value={video.position ?? ''} onChange={(e)=>handleArrayItemUpdate('videos', i, 'position', e.target.value === '' ? undefined : parseInt(e.target.value))} className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Auto</option>
                      {[0,1,2,3,4].map(pos => (<option key={pos} value={pos}>{pos}</option>))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Position in the video carousel (0=left, 2=middle, 4=right)</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      case 'reviews':
        return (
          <div className="space-y-3 md:space-y-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-base md:text-lg font-semibold">Text Reviews</h3>
              <button onClick={() => handleArrayItemAdd('reviews')} className="bg-blue-500 text-white px-3 py-1 rounded text-xs md:text-sm hover:bg-blue-600">Add Review</button>
            </div>
            {(formData.reviews || []).map((rev, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-3 md:p-4">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-sm md:text-base font-medium">Review {i + 1}</h4>
                  <button onClick={() => handleArrayItemRemove('reviews', i)} className="text-red-600 hover:text-red-800 text-xs md:text-sm">Remove</button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Author</label>
                    <input type="text" value={rev.author || ''} onChange={(e)=>handleArrayItemUpdate('reviews', i, 'author', e.target.value)} className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Avatar Image</label>
                    <ImageUpload currentImageUrl={rev.avatarUrl || ''} onImageUpload={(url) => handleArrayItemUpdate('reviews', i, 'avatarUrl', url)} imageType={`review-${i}`} slug={formData.slug} label="Avatar Image" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Text</label>
                    <textarea rows={3} value={rev.text || ''} onChange={(e)=>handleArrayItemUpdate('reviews', i, 'text', e.target.value)} className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      case 'images':
        return (
          <div className="space-y-4 md:space-y-6">
            <h3 className="text-base md:text-lg font-semibold">Edit Images</h3>
            
            <ImageUpload
              currentImageUrl={formData.hero_image_url}
              onImageUpload={(url) => handleInputChange('hero_image_url', url)}
              imageType="hero"
              slug={formData.slug}
              label="Hero Image"
            />
            
            <ImageUpload
              currentImageUrl={formData.benefits_image_url}
              onImageUpload={(url) => handleInputChange('benefits_image_url', url)}
              imageType="benefits"
              slug={formData.slug}
              label="Benefits Section Image"
            />
            
            <ImageUpload
              currentImageUrl={formData.right_image_url}
              onImageUpload={(url) => handleInputChange('right_image_url', url)}
              imageType="right"
              slug={formData.slug}
              label="Therapy Types Right Image"
            />
            
            <ImageUpload
              currentImageUrl={formData.left_image_url || ''}
              onImageUpload={(url) => handleInputChange('left_image_url', url)}
              imageType="left"
              slug={formData.slug}
              label="FAQ Left Image"
            />
            
            <ImageUpload
              currentImageUrl={formData.mobile_image_url}
              onImageUpload={(url) => handleInputChange('mobile_image_url', url)}
              imageType="mobile"
              slug={formData.slug}
              label="Mobile Image"
            />
          </div>
        );

      case 'assigned_doctors':
        return (
          <div className="space-y-3 md:space-y-4">
            <h3 className="text-base md:text-lg font-semibold">Assign Doctors for Assessment Booking</h3>
            <p className="text-xs md:text-sm text-gray-600">Select up to 2 doctors. Their availability will be combined in the booking calendar.</p>
            {therapists.length === 0 ? (
              <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">No doctors available. Please add doctors first in the Doctors section.</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {therapists.map((doc) => {
                    const isSelected = formData.assigned_doctor_ids?.includes(doc.id);
                    return (
                      <label key={doc.id} className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const current = formData.assigned_doctor_ids || [];
                            const updated = e.target.checked
                              ? [...current.slice(0, 1), doc.id].slice(0, 2) // Keep max 2, add new
                              : current.filter(id => id !== doc.id);
                            handleInputChange('assigned_doctor_ids', updated);
                          }}
                          disabled={!isSelected && formData.assigned_doctor_ids?.length >= 2}
                          className="rounded border-gray-300"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{doc.first_name} {doc.last_name}</div>
                          <div className="text-xs text-gray-500">{doc.area_of_expertise?.join(', ') || 'No specialties'}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                {formData.assigned_doctor_ids?.length === 2 && (
                  <p className="text-xs text-amber-600">Maximum 2 doctors selected. Uncheck one to select another.</p>
                )}
                {formData.assigned_doctor_ids?.length > 0 && (
                  <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                    <p className="text-xs text-blue-800 font-medium">Selected: {formData.assigned_doctor_ids.length} of 2 doctors</p>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allow_cash_payment || false}
                      onChange={(e) => handleInputChange('allow_cash_payment', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <div>
                      <div className="font-medium text-sm">Allow Cash Payment</div>
                      <div className="text-xs text-gray-500">Enable cash payment option in booking calendar</div>
                    </div>
                  </label>
                </div>
              </>
            )}
          </div>
        );

      case 'seo':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">SEO Settings</h3>
              <p className="text-sm text-gray-600 mb-4">Optimize your page for search engines and social media sharing</p>
            </div>

            {/* Basic SEO */}
            <div className="border-b pb-4">
              <h4 className="text-md font-medium mb-3 text-gray-800">📊 Basic SEO</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Page Title (Meta Title)
                  </label>
                  <input
                    type="text"
                    value={formData.seo_title}
                    onChange={(e) => handleInputChange('seo_title', e.target.value)}
                    placeholder="e.g., Anxiety Counselling for Children - MyKoott"
                    maxLength={60}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.seo_title?.length || 0}/60 characters (optimal: 50-60)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meta Description
                  </label>
                  <textarea
                    value={formData.seo_description}
                    onChange={(e) => handleInputChange('seo_description', e.target.value)}
                    placeholder="Brief description that appears in search results..."
                    maxLength={160}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.seo_description?.length || 0}/160 characters (optimal: 150-160)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Focus Keywords (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.seo_keywords || ''}
                    onChange={(e) => handleInputChange('seo_keywords', e.target.value)}
                    placeholder="e.g., child anxiety, kids assessments, therapy for children"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Main keywords for this page (3-5 recommended)</p>
                </div>
              </div>
            </div>

            {/* Open Graph / Social Media */}
            <div className="border-b pb-4">
              <h4 className="text-md font-medium mb-3 text-gray-800">📱 Social Media Preview (Open Graph)</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Social Media Title
                  </label>
                  <input
                    type="text"
                    value={formData.og_title || ''}
                    onChange={(e) => handleInputChange('og_title', e.target.value)}
                    placeholder="Leave empty to use SEO Title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Title when shared on Facebook, LinkedIn, etc.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Social Media Description
                  </label>
                  <textarea
                    value={formData.og_description || ''}
                    onChange={(e) => handleInputChange('og_description', e.target.value)}
                    placeholder="Leave empty to use Meta Description"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Social Media Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.og_image || ''}
                    onChange={(e) => handleInputChange('og_image', e.target.value)}
                    placeholder="https://example.com/image.jpg (1200x630px recommended)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Image shown when shared on social media (1200x630px optimal)</p>
                </div>
              </div>
            </div>

            {/* Advanced SEO */}
            <div className="border-b pb-4">
              <h4 className="text-md font-medium mb-3 text-gray-800">🎯 Advanced SEO</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Canonical URL (optional)
                  </label>
                  <input
                    type="url"
                    value={formData.canonical_url || ''}
                    onChange={(e) => handleInputChange('canonical_url', e.target.value)}
                    placeholder="Leave empty for default"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Prevent duplicate content issues</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Robots Meta Tag
                  </label>
                  <select
                    value={formData.robots || 'index,follow'}
                    onChange={(e) => handleInputChange('robots', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="index,follow">Index, Follow (Default - Allow search engines)</option>
                    <option value="noindex,follow">No Index, Follow (Hide from search)</option>
                    <option value="index,nofollow">Index, No Follow (Show but don't follow links)</option>
                    <option value="noindex,nofollow">No Index, No Follow (Completely hide)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Control how search engines crawl this page</p>
                </div>
              </div>
            </div>

            {/* Structured Data */}
            <div>
              <h4 className="text-md font-medium mb-3 text-gray-800">🏗️ Structured Data (Schema.org)</h4>
              <div className="space-y-3">
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.schema_enabled !== false}
                      onChange={(e) => handleInputChange('schema_enabled', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">Enable Medical Service Schema</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Helps Google understand this is a mental health service</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Type
                  </label>
                  <input
                    type="text"
                    value={formData.schema_service_type || ''}
                    onChange={(e) => handleInputChange('schema_service_type', e.target.value)}
                    placeholder="e.g., Child Anxiety Counselling, ADHD Therapy"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Specific service type for schema markup</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 flex h-screen">
      {/* Mobile Backdrop Overlay */}
      {showSidebar && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}
      
      {/* Sidebar */}
      {showSidebar && (
        <div className="fixed md:relative top-0 left-0 bottom-0 w-4/5 sm:w-3/5 md:w-80 lg:w-96 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden z-50 md:z-auto shadow-2xl md:shadow-none">
          {/* Header */}
          <div className="p-3 md:p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-sm md:text-base font-medium text-gray-700">Page Builder</h2>
              <button
                onClick={() => setShowSidebar(false)}
                className="md:hidden text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-2 flex space-x-2">
              <button
                onClick={() => setIsPreviewMode(true)}
                className={`flex-1 md:flex-none px-3 py-1 rounded text-xs md:text-sm ${
                  isPreviewMode ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setIsPreviewMode(false)}
                className={`flex-1 md:flex-none px-3 py-1 rounded text-xs md:text-sm ${
                  !isPreviewMode ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                Edit
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3 md:p-4">
            {activeElement ? (
              <div>
                {renderElementEditor()}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setActiveElement(null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm md:text-base text-gray-700 hover:bg-gray-50"
                  >
                    Close Editor
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs md:text-sm font-medium text-gray-600 mb-2">Basic Settings</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Slug
                      </label>
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={(e) => handleInputChange('slug', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., adhd-assessment"
                      />
                      <p className="text-xs text-gray-500 mt-1">Used in the page URL. Only lowercase letters, numbers, and hyphens.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Menu Category (Assessments)
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Category</option>
                        <option value="adhd">ADHD</option>
                        <option value="ebs">Emotional & Behavioral Screening</option>
                        <option value="intelligence">Intelligence Test</option>
                        <option value="projective">Projective Tests</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Choose which submenu this page will appear under in the header</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Menu Order
                      </label>
                      <input
                        type="number"
                        value={formData.menu_order}
                        onChange={(e) => handleInputChange('menu_order', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">Lower numbers appear first in the menu (0 = first)</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs md:text-sm font-medium text-gray-600 mb-2">Page Elements</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleElementClick('hero')}
                      className="w-full text-left px-3 py-2 md:py-2.5 text-sm md:text-base border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      🎯 Hero Section
                    </button>
                    <button
                      onClick={() => handleElementClick('assigned_doctors')}
                      className="w-full text-left px-3 py-2 md:py-2.5 text-sm md:text-base border border-gray-200 rounded-md hover:bg-gray-50 transition-colors bg-blue-50 border-blue-200"
                    >
                      👨‍⚕️ Assigned Doctors
                    </button>
                    <button
                      onClick={() => handleElementClick('benefits')}
                      className="w-full text-left px-3 py-2 md:py-2.5 text-sm md:text-base border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      ✨ Benefits
                    </button>
                    <button
                      onClick={() => handleElementClick('types')}
                      className="w-full text-left px-3 py-2 md:py-2.5 text-sm md:text-base border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      🎭 Therapy Types
                    </button>
                    <button
                      onClick={() => handleElementClick('condition_boxes')}
                      className="w-full text-left px-3 py-2 md:py-2.5 text-sm md:text-base border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      📦 Condition Boxes
                    </button>
                    <button
                      onClick={() => handleElementClick('faqs')}
                      className="w-full text-left px-3 py-2 md:py-2.5 text-sm md:text-base border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      ❓ FAQs
                    </button>
                    <button
                      onClick={() => handleElementClick('images')}
                      className="w-full text-left px-3 py-2 md:py-2.5 text-sm md:text-base border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      🖼️ Images
                    </button>
                    <button
                      onClick={() => handleElementClick('videos')}
                      className="w-full text-left px-3 py-2 md:py-2.5 text-sm md:text-base border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      🎥 Video Reviews
                    </button>
                    <button
                      onClick={() => handleElementClick('reviews')}
                      className="w-full text-left px-3 py-2 md:py-2.5 text-sm md:text-base border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      ⭐ Text Reviews
                    </button>
                    <button
                      onClick={() => handleElementClick('info_cards')}
                      className="w-full text-left px-3 py-2 md:py-2.5 text-sm md:text-base border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      🧩 Info Cards
                    </button>
                    <button
                      onClick={() => handleElementClick('seo')}
                      className="w-full text-left px-3 py-2 md:py-2.5 text-sm md:text-base border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      🔍 SEO Settings
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 md:p-4 border-t border-gray-200 flex-shrink-0">
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm md:text-base text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md text-sm md:text-base hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 p-2 md:p-4 flex-shrink-0 relative z-30">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-xs md:text-sm whitespace-nowrap"
              >
                {showSidebar ? 'Hide Editor' : 'Show Editor'}
              </button>
              <h1 className="text-xs md:text-sm font-light text-gray-400 truncate">
                {formData.slug ? `/assessments/${formData.slug}` : 'New Assessment Page'}
              </h1>
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                onClick={() => window.open(`/assessments/${formData.slug}`, '_blank')}
                disabled={!formData.slug}
                className="flex-1 sm:flex-none px-3 md:px-4 py-2 border border-gray-300 rounded-md text-xs md:text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                View Live
              </button>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="bg-white min-h-full">
            {/* Hero Section */}
            {renderEditableElement('hero', (
              <HeroSection 
                key={`hero-${formData.hero_title}-${formData.hero_subtext}-${formData.hero_cta_text}`}
                therapyType="anxiety-sadness" 
                cmsData={{
                  title: formData.hero_title,
                  subtext: formData.hero_subtext,
                  ctaText: formData.hero_cta_text,
                  imageUrl: normalizeImageUrl(formData.hero_image_url),
                  features: [formData.hero_point_1, formData.hero_point_2, formData.hero_point_3].filter(Boolean)
                }}
              />
            ))}

            {/* Logos Strip */}
            <LogosStrip bgColor="bg-[#15171A]" height="py-4" logosCount={6} />

            {/* Therapists Heading (preview) */}
            {renderEditableElement('therapists', (
              <div className="mx-auto max-w-4xl px-4 sm:px-6 mt-8 md:mt-12">
                <div className="px-4 sm:px-6 mb-4 md:mb-6 text-center">
                  <div className="mt-3 mb-8 md:mb-6 text-center md:text-center max-w-full md:max-w-4xl mx-auto px-4">
                    <h2 className="how-it-works-heading text-center text-base md:text-xl lg:text-2xl" style={{ fontSize: '24px', fontWeight: 600, lineHeight: '1.1' }}>
                      {formData.therapists_heading || 'Your journey to a happier, calmer home begins here.'}
                    </h2>
                  </div>
                </div>
                <TherapistCarousel therapists={therapists} />
              </div>
            ))}

            {/* How It Works */}
            <HowItWorks />

            {/* Consultation Banner removed */}

            {/* Benefits Section */}
            {renderEditableElement('benefits', (
              <BenefitsSection 
                key={`benefits-${JSON.stringify(formData.benefits)}-${formData.benefits_image_url}-${formData.benefits_title}`}
                therapyType="anxiety-sadness" 
                cmsData={{
                  title: formData.benefits_title,
                  benefits: formData.benefits,
                  benefitsImageUrl: normalizeImageUrl(formData.benefits_image_url)
                }}
                showAllBenefits={true}
              />
            ))}

            {/* Therapy Types */}
            {renderEditableElement('types', (
              <TherapyTypesSplit 
                key={`types-${JSON.stringify(formData.types)}-${formData.right_image_url}-${formData.types_title}-${formData.slug}`}
                therapyType={formData.slug || 'anxiety-sadness'}
                cmsData={{
                  title: formData.types_title,
                  types: formData.types,
                  rightImageUrl: normalizeImageUrl(formData.right_image_url)
                }}
              />
            ))}

            {/* Videos (preview) */}
            {renderEditableElement('videos', (
              <div className="mt-8">
                <VideosShowcase cmsData={{ videos: formData.videos || [] }} />
              </div>
            ))}

            {/* Reviews (preview) */}
            {renderEditableElement('reviews', (
              <div className="mt-8">
                <Reviews cmsData={{ reviews: formData.reviews || [] }} />
              </div>
            ))}

            {/* Condition Boxes - removed */}

            {/* Info Cards */}
            {renderEditableElement('info_cards', (
              <InfoCards cmsData={{ items: formData.info_cards }} />
            ))}

            {/* FAQs */}
            {renderEditableElement('faqs', (
              <div className="mt-24" key={`faqs-${JSON.stringify(formData.faqs)}-${formData.left_image_url}`}>
                <HelpFaq 
                  cmsData={{
                    faqs: formData.faqs,
                    leftImageUrl: normalizeImageUrl(formData.left_image_url)
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
