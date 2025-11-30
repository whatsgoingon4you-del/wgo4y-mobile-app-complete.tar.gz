import React from 'react';

const Logo = ({ className = "h-10", onClick }) => {
  return (
    <img 
      src="/assets/wgo4y-logo.png" 
      alt="WGO4Y" 
      className={className}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    />
  );
};

export default Logo;
