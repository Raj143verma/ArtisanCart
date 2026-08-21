import type { Category } from '../../types/catalog';

interface CategoryNavProps {
  categories: Category[];
  selectedCategoryId?: string;
  onSelectCategory: (categoryId?: string) => void;
  variant?: 'pills' | 'tree';
}

export function CategoryNav({
  categories,
  selectedCategoryId,
  onSelectCategory,
  variant = 'tree',
}: CategoryNavProps) {
  if (variant === 'pills') {
    return (
      <div className="category-pills-bar" role="navigation" aria-label="Category shortcuts">
        <button
          type="button"
          className={`category-pill ${!selectedCategoryId ? 'active' : ''}`}
          onClick={() => onSelectCategory(undefined)}
        >
          All Categories
        </button>
        {categories.map((category) => (
          <button
            key={category._id}
            type="button"
            className={`category-pill ${selectedCategoryId === category._id ? 'active' : ''}`}
            onClick={() => onSelectCategory(category._id)}
          >
            {category.name}
          </button>
        ))}
      </div>
    );
  }

  // Hierarchical tree navigation
  return (
    <ul className="category-nav-tree" role="tree" aria-label="Product Categories">
      <li>
        <button
          type="button"
          className={!selectedCategoryId ? 'active' : ''}
          onClick={() => onSelectCategory(undefined)}
        >
          <span>All Categories</span>
        </button>
      </li>

      {categories.map((category) => {
        const isSelected = selectedCategoryId === category._id;
        const hasChildren = category.children && category.children.length > 0;

        return (
          <li key={category._id} role="treeitem" aria-selected={isSelected}>
            <button
              type="button"
              className={isSelected ? 'active' : ''}
              onClick={() => onSelectCategory(category._id)}
            >
              <span>{category.name}</span>
            </button>

            {hasChildren && (
              <ul className="subcategories">
                {category.children!.map((sub) => {
                  const isSubSelected = selectedCategoryId === sub._id;
                  return (
                    <li key={sub._id}>
                      <button
                        type="button"
                        className={isSubSelected ? 'active' : ''}
                        onClick={() => onSelectCategory(sub._id)}
                      >
                        <span>{sub.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
