// Utility function to check if client contact information is complete
export const isClientContactComplete = (clientProfile) => {
  if (!clientProfile) return false;
  
  console.log('🔍 Debugging client profile:', clientProfile);
  
  const requiredFields = ['first_name', 'last_name', 'phone_number'];
  
  const result = requiredFields.every(field => {
    const value = clientProfile[field];
    const isValid = value && 
           value.toString().trim() !== '' && 
           value !== 'Pending' && 
           value !== 'Update' &&
           value !== '+91'; // Default phone number
    
    console.log(`🔍 Field ${field}: "${value}" -> ${isValid ? 'VALID' : 'INVALID'}`);
    return isValid;
  });
  
  console.log('🔍 Overall result:', result);
  return result;
};

// Utility function to get incomplete contact fields
export const getIncompleteContactFields = (clientProfile) => {
  if (!clientProfile) return ['first_name', 'last_name', 'phone_number'];
  
  const requiredFields = [
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { key: 'phone_number', label: 'Phone Number' }
  ];
  
  return requiredFields.filter(field => {
    const value = clientProfile[field.key];
    return !value || 
           value.toString().trim() === '' || 
           value === 'Pending' || 
           value === 'Update' ||
           value === '+91'; // Default phone number
  });
};
