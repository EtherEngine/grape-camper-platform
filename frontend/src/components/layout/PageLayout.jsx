import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import './PageLayout.css';

export default function PageLayout() {
  return (
    <div className="page-layout">
      <Navbar />
      <main className="page-layout__content container">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}