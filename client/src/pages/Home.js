import { Link } from 'react-router-dom';
import carImage from '../assets/Polo Car.jpeg';
import './Home.css';

const Home = () => {
  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-text">
            <p className="hero-tagline">Rent your ride now</p>
            <h1 className="hero-title">
              Save <span className="highlight">big</span> with our<br />
              car rental
            </h1>
            <p className="hero-subtitle">
              Rent the car of your dreams. Unbeatable prices, unlimited miles, flexible pick-up options and much more.
            </p>
            <div className="hero-buttons">
              <Link to="/cars" className="btn btn-primary btn-lg">
                🚗 Browse Cars
              </Link>
              <Link to="/register" className="btn btn-secondary btn-lg">
                📝 Get Started
              </Link>
            </div>
          </div>
          <div className="hero-image">
            <img src={carImage} alt="Polo Car" className="car-image" />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;