import React from 'react';

const Header = ({ onOpenModal }) => {
  return (
    <header className="header">
      <div className="header-title">
        Workspace overview
      </div>
      <div className="header-actions">
        <button className="btn btn-primary" onClick={onOpenModal}>+ New Deal</button>
        <div className="user-profile">
          <div className="avatar">N</div>
          <span>Naphat</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
