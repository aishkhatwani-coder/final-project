import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getPortfolioItems } from '../api/portfolio';
import './Portfolio.css';

const PORTFOLIO_DATA = [
  {
    _id: 'p1',
    title: 'Minimalist Scandinavian Living Space',
    category: 'Living Room',
    space: 'Living Room',
    style: 'Scandinavian',
    designer: 'Aura Studio',
    image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80',
    description: 'Clean aesthetic with organic textures, bespoke oak cabinetry, and warm neutral tones.',
    budgetRange: '₹12L - ₹15L',
    areaSize: '1,450 sq.ft',
    duration: '6 wks'
  },
  {
    _id: 'p2',
    title: 'Serene Japandi Master Suite',
    category: 'Bedroom',
    space: 'Bedroom',
    style: 'Minimalist',
    designer: 'Studio Interior',
    image: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=800&q=80',
    description: 'Harmonious fusion of Japanese minimalism and warm Scandinavian functionality.',
    budgetRange: '₹8L - ₹10L',
    areaSize: '550 sq.ft',
    duration: '4 wks'
  },
  {
    _id: 'p3',
    title: 'Bespoke Marble & Oak Culinary Space',
    category: 'Kitchen',
    space: 'Kitchen',
    style: 'Modern',
    designer: 'Atelier Luxe',
    image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
    description: 'Integrated smart appliances, brushed brass hardware, and waterfall marble island.',
    budgetRange: '₹15L - ₹18L',
    areaSize: '420 sq.ft',
    duration: '5 wks'
  },
  {
    _id: 'p4',
    title: 'Executive Penthouse Atelier',
    category: 'Office',
    space: 'Office',
    style: 'Industrial',
    designer: 'Studio Director',
    image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
    description: 'Acoustic architectural paneling with panoramic views and customized walnut millwork.',
    budgetRange: '₹6L - ₹9L',
    areaSize: '380 sq.ft',
    duration: '3 wks'
  }
];

function Portfolio() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [style, setStyle] = useState(searchParams.get('style') || '');
  const [search, setSearch] = useState('');
  const [portfolioData, setPortfolioData] = useState(PORTFOLIO_DATA);
  const [portfolioError, setPortfolioError] = useState('');

  useEffect(() => {
    let isActive = true;
    getPortfolioItems()
      .then((res) => {
        if (isActive && Array.isArray(res.data)) {
          setPortfolioData(res.data.map((item) => ({
            ...item,
            image: item.images?.[0] || item.image || '',
            designer: item.designerName || item.designer || 'Aura Studio'
          })));
        }
      })
      .catch((error) => {
        console.error('Could not load portfolio projects:', error);
        if (isActive) setPortfolioError('Showing the saved portfolio preview because live projects could not be loaded.');
      });
    return () => {
      isActive = false;
    };
  }, []);

  const categories = [
    { label: 'All Spaces', value: '' },
    { label: 'Living Room', value: 'Living Room' },
    { label: 'Bedroom', value: 'Bedroom' },
    { label: 'Kitchen', value: 'Kitchen' },
    { label: 'Office', value: 'Office' }
  ];

  const styles = [
    { label: 'All Styles', value: '' },
    { label: 'Modern', value: 'Modern' },
    { label: 'Minimalist', value: 'Minimalist' },
    { label: 'Traditional', value: 'Traditional' },
    { label: 'Industrial', value: 'Industrial' },
    { label: 'Scandinavian', value: 'Scandinavian' }
  ];

  // Instant reactive filter
  const items = useMemo(() => {
    return portfolioData.filter((item) => {
      const matchCategory = !category || item.category.toLowerCase() === category.toLowerCase();
      const matchStyle = !style || item.style.toLowerCase() === style.toLowerCase();
      const query = search.trim().toLowerCase();
      const matchSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.designer.toLowerCase().includes(query) ||
        item.style.toLowerCase().includes(query);

      return matchCategory && matchStyle && matchSearch;
    });
  }, [category, style, search, portfolioData]);

  const handleResetFilters = () => {
    setCategory('');
    setStyle('');
    setSearch('');
    setSearchParams({});
  };

  return (
    <div className="portfolio-page">
      <div className="portfolio-container">
        {/* Header */}
        <div className="portfolio-header">
          <span className="portfolio-badge">Architectural Showcase</span>
          <h1>Our Signature Portfolio</h1>
          <p className="portfolio-subtitle">
            Immerse yourself in our curated gallery of bespoke residential sanctuaries, modular kitchens, and executive workspaces.
          </p>
        </div>
        {portfolioError && (
          <p role="status" style={{ color: '#777', fontSize: '13px', marginTop: '-16px' }}>
            {portfolioError}
          </p>
        )}

        {/* Filter Controls */}
        <div className="portfolio-controls">
          <div className="controls-top-row">
            <div className="search-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="Search projects, styles, designers (e.g. 'Living', 'Scandinavian', 'Modern')..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="style-select"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
            >
              {styles.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Spaces Chips */}
          <div className="category-chips">
            <span className="chip-label">Spaces:</span>
            {categories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                className={`category-chip ${category === cat.value ? 'active' : ''}`}
                onClick={() => setCategory(cat.value)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Active Filter Bar */}
          {(category || style || search) && (
            <div className="active-filter-bar">
              <span>
                Showing results for{' '}
                <strong>
                  {[category, style, search ? `"${search}"` : ''].filter(Boolean).join(' • ')}
                </strong>{' '}
                ({items.length} {items.length === 1 ? 'project' : 'projects'})
              </span>
              <button className="clear-btn" onClick={handleResetFilters}>
                Clear All Filters ✕
              </button>
            </div>
          )}
        </div>

        {/* Gallery Grid */}
        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏛️</div>
            <h3>No matching design projects found</h3>
            <p>Try adjusting your search terms, style preferences, or space categories.</p>
            <button className="btn-reset-filters" onClick={handleResetFilters}>
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="gallery-grid">
            {items.map((item) => (
              <Link
                key={item._id}
                to={`/portfolio/${item._id}`}
                className="portfolio-card"
              >
                <div className="card-image-wrapper">
                  <img src={item.image} alt={item.title} />
                  <span className="card-badge">{item.category}</span>
                  <span className="card-style-badge">{item.style}</span>
                </div>

                <div className="card-body">
                  <h3>{item.title}</h3>
                  <p className="card-description">{item.description}</p>

                  <div className="card-meta-row">
                    <div className="card-meta-item">
                      <span>Budget</span>
                      <strong>{item.budgetRange}</strong>
                    </div>
                    <div className="card-meta-item">
                      <span>Carpet Area</span>
                      <strong>{item.areaSize}</strong>
                    </div>
                    <div className="card-meta-item">
                      <span>Timeline</span>
                      <strong>{item.duration}</strong>
                    </div>
                  </div>

                  <div className="card-designer">
                    <span>Lead: {item.designer}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Portfolio;