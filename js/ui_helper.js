/**
 * js/ui_helper.js - Reusable UI Components
 * 
 * Centralizes the generation of dynamic HTML elements to ensure design
 * consistency across the entire application and eliminate code duplication.
 */

const UIHelper = {
    /**
     * Generates a standardized Manga Card for use in grids
     * and scrolling rows.
     * 
     * @param {Object} manga - The normalized manga data object.
     * @param {Function} onClickCallback - The function to run when the card is clicked.
     * @param {string} extraBadgeText - Optional text for a corner badge
     * @returns {HTMLElement} - The fully constructed DOM element.
     */
    createMangaCard(manga, onClickCallback, extraBadgeText = null) {
        const itemContainer = document.createElement('div');
        itemContainer.className = 'manga-item';

        const card = document.createElement('div');
        card.className = 'manga-card';
        card.style.backgroundImage = `url('${manga.coverImage}')`;
        card.style.backgroundSize = 'cover';
        card.style.backgroundPosition = 'center';
        card.style.position = 'relative'; 
        card.title = manga.title;

        // For page badge
        if (extraBadgeText) {
            const badge = document.createElement('div');
            badge.style.position = 'absolute';
            badge.style.bottom = '8px';
            badge.style.right = '8px';
            badge.style.backgroundColor = 'rgba(229, 9, 20, 0.9)';
            badge.style.color = 'white';
            badge.style.padding = '4px 8px';
            badge.style.borderRadius = '4px';
            badge.style.fontSize = '0.75rem';
            badge.style.fontWeight = 'bold';
            badge.textContent = extraBadgeText;
            card.appendChild(badge);
        }

        const titleElem = document.createElement('div');
        titleElem.className = 'manga-title-below';
        titleElem.textContent = manga.title;
        titleElem.title = manga.title;

        card.addEventListener('click', () => onClickCallback(manga));
        titleElem.addEventListener('click', () => onClickCallback(manga));

        itemContainer.appendChild(card);
        itemContainer.appendChild(titleElem);

        return itemContainer;
    }
};