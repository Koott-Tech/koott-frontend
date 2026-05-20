"use client";

import { useState, useEffect } from 'react';

export default function CounsellingServiceForm({ 
  initialData = null, 
  onSubmit, 
  onCancel, 
  loading = false, 
  submitText = "Save Service" 
}) {
  const [formData, setFormData] = useState({
    slug: '',
    status: 'draft',
    seo_title: '',
    seo_description: '',
    hero_title: '',
    hero_subtext: '',
    hero_image_url: '',
    benefits: [],
    types: [],
    faqs: [],
    testimonials: [],
    right_image_url: '',
    mobile_image_url: ''
  });

  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (initialData) {
      setFormData({
        slug: initialData.slug || '',
        status: initialData.status || 'draft',
        seo_title: initialData.seo_title || '',
        seo_description: initialData.seo_description || '',
        hero_title: initialData.hero_title || '',
        hero_subtext: initialData.hero_subtext || '',
        hero_image_url: initialData.hero_image_url || '',
        benefits: initialData.benefits || [],
        types: initialData.types || [],
        faqs: initialData.faqs || [],
        testimonials: initialData.testimonials || [],
        right_image_url: initialData.right_image_url || '',
        mobile_image_url: initialData.mobile_image_url || ''
      });
    }
  }, [initialData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayItemAdd = (field) => {
    const newItem = field === 'benefits' ? { title: '', description: '', iconUrl: '' } :
                   field === 'types' ? { title: '', description: '' } :
                   field === 'faqs' ? { question: '', answer: '' } :
                   { quote: '', by: '' };
    
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

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'seo', label: 'SEO' },
    { id: 'hero', label: 'Hero Section' },
    { id: 'benefits', label: 'Benefits' },
    { id: 'types', label: 'Types' },
    { id: 'faqs', label: 'FAQs' },
    { id: 'testimonials', label: 'Testimonials' },
    { id: 'images', label: 'Images' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-[#189e4f] text-[#189e4f]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        {activeTab === 'basic' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slug *
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => handleInputChange('slug', e.target.value)}
                placeholder="e.g., depression, anxiety-sadness"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#189e4f]"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                URL slug for the counselling service (e.g., /counselling/depression)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#189e4f]"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'seo' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SEO Title
              </label>
              <input
                type="text"
                value={formData.seo_title}
                onChange={(e) => handleInputChange('seo_title', e.target.value)}
                placeholder="e.g., Depression Counselling - Koott"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#189e4f]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SEO Description
              </label>
              <textarea
                value={formData.seo_description}
                onChange={(e) => handleInputChange('seo_description', e.target.value)}
                placeholder="Meta description for search engines"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#189e4f]"
              />
            </div>
          </div>
        )}

        {activeTab === 'hero' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hero Title *
              </label>
              <input
                type="text"
                value={formData.hero_title}
                onChange={(e) => handleInputChange('hero_title', e.target.value)}
                placeholder="e.g., Depression Counselling for Children"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#189e4f]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hero Subtext
              </label>
              <textarea
                value={formData.hero_subtext}
                onChange={(e) => handleInputChange('hero_subtext', e.target.value)}
                placeholder="Supporting text for the hero section"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#189e4f]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hero Image URL
              </label>
              <input
                type="url"
                value={formData.hero_image_url}
                onChange={(e) => handleInputChange('hero_image_url', e.target.value)}
                placeholder="https://example.com/hero-image.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#189e4f]"
              />
            </div>
          </div>
        )}

        {activeTab === 'benefits' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Benefits</h3>
              <button
                type="button"
                onClick={() => handleArrayItemAdd('benefits')}
                className="bg-[#189e4f] text-white px-4 py-2 rounded-md hover:bg-[#189e4f] transition-colors duration-200"
              >
                Add Benefit
              </button>
            </div>
            {formData.benefits.map((benefit, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-medium">Benefit {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => handleArrayItemRemove('benefits', index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={benefit.title}
                      onChange={(e) => handleArrayItemUpdate('benefits', index, 'title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#189e4f]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Icon URL
                    </label>
                    <input
                      type="url"
                      value={benefit.iconUrl}
                      onChange={(e) => handleArrayItemUpdate('benefits', index, 'iconUrl', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#189e4f]"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={benefit.description}
                    onChange={(e) => handleArrayItemUpdate('benefits', index, 'description', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#189e4f]"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'types' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Types</h3>
              <button
                type="button"
                onClick={() => handleArrayItemAdd('types')}
                className="bg-[#189e4f] text-white px-4 py-2 rounded-md hover:bg-[#189e4f] transition-colors duration-200"
              >
                Add Type
              </button>
            </div>
            {formData.types.map((type, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-medium">Type {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => handleArrayItemRemove('types', index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={type.title}
                      onChange={(e) => handleArrayItemUpdate('types', index, 'title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#189e4f]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={type.description}
                      onChange={(e) => handleArrayItemUpdate('types', index, 'description', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#189e4f]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'faqs' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">FAQs</h3>
              <button
                type="button"
                onClick={() => handleArrayItemAdd('faqs')}
                className="bg-[#189e4f] text-white px-4 py-2 rounded-md hover:bg-[#189e4f] transition-colors duration-200"
              >
                Add FAQ
              </button>
            </div>
            {formData.faqs.map((faq, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-medium">FAQ {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => handleArrayItemRemove('faqs', index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Question
                    </label>
                    <input
                      type="text"
                      value={faq.question}
                      onChange={(e) => handleArrayItemUpdate('faqs', index, 'question', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#189e4f]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Answer
                    </label>
                    <textarea
                      value={faq.answer}
                      onChange={(e) => handleArrayItemUpdate('faqs', index, 'answer', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#189e4f]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'testimonials' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Testimonials</h3>
              <button
                type="button"
                onClick={() => handleArrayItemAdd('testimonials')}
                className="bg-[#189e4f] text-white px-4 py-2 rounded-md hover:bg-[#189e4f] transition-colors duration-200"
              >
                Add Testimonial
              </button>
            </div>
            {formData.testimonials.map((testimonial, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-medium">Testimonial {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => handleArrayItemRemove('testimonials', index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quote
                    </label>
                    <textarea
                      value={testimonial.quote}
                      onChange={(e) => handleArrayItemUpdate('testimonials', index, 'quote', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#189e4f]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      By
                    </label>
                    <input
                      type="text"
                      value={testimonial.by}
                      onChange={(e) => handleArrayItemUpdate('testimonials', index, 'by', e.target.value)}
                      placeholder="e.g., Sarah M., Parent of 8-year-old"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#189e4f]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'images' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Right Side Image URL
              </label>
              <input
                type="url"
                value={formData.right_image_url}
                onChange={(e) => handleInputChange('right_image_url', e.target.value)}
                placeholder="https://example.com/right-image.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#189e4f]"
              />
              <p className="text-sm text-gray-500 mt-1">
                Image displayed on the right side of the therapy types section
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mobile Image URL
              </label>
              <input
                type="url"
                value={formData.mobile_image_url}
                onChange={(e) => handleInputChange('mobile_image_url', e.target.value)}
                placeholder="https://example.com/mobile-image.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#189e4f]"
              />
              <p className="text-sm text-gray-500 mt-1">
                Image displayed on mobile devices
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors duration-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-[#189e4f] text-white rounded-md hover:bg-[#189e4f] transition-colors duration-200 disabled:opacity-50"
        >
          {loading ? 'Saving...' : submitText}
        </button>
      </div>
    </form>
  );
}
