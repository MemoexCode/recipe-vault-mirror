import { COLORS, DIFFICULTY_LABELS } from './constants';

// Funktion zum Exportieren eines Rezepts als druckbares HTML/PDF
export const exportRecipeToPrint = (recipe, categories) => {
  const mealCategory = categories.find(c => c.category_type === "meal" && c.name === recipe.meal_type);
  const gangCategory = categories.find(c => c.category_type === "gang" && c.name === recipe.gang);
  const cuisineCategory = categories.find(c => c.category_type === "cuisine" && c.name === recipe.cuisine);

  const totalTime = (parseInt(recipe.prep_time_minutes) || 0) + (parseInt(recipe.cook_time_minutes) || 0);

  // Generiere HTML für den Druck
  const printContent = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${recipe.title} - RecipeVault</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: A4;
      margin: 15mm;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: ${COLORS.TEXT_PRIMARY};
      background: white;
      font-size: 9pt;
      line-height: 1.3;
    }
    
    .page-header {
      text-align: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 3px solid ${COLORS.ACCENT};
    }
    
    .recipe-title {
      font-size: 20pt;
      font-weight: 700;
      color: ${COLORS.TEXT_PRIMARY};
      margin-bottom: 4px;
    }
    
    .recipe-subtitle {
      font-size: 9pt;
      color: ${COLORS.TEXT_SECONDARY};
      margin-bottom: 6px;
    }
    
    .recipe-meta {
      display: flex;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
      font-size: 8pt;
    }
    
    .meta-badge {
      padding: 2px 8px;
      border-radius: 10px;
      background: ${COLORS.SILVER_LIGHTER};
      color: ${COLORS.TEXT_PRIMARY};
      font-weight: 500;
    }
    
    .meta-badge.accent {
      background: ${COLORS.ACCENT};
      color: white;
    }
    
    .content-grid {
      display: grid;
      grid-template-columns: 33% 67%;
      gap: 12px;
      margin-bottom: 10px;
    }
    
    .section {
      margin-bottom: 10px;
    }
    
    .section-title {
      font-size: 11pt;
      font-weight: 700;
      color: ${COLORS.ACCENT};
      margin-bottom: 6px;
      padding-bottom: 3px;
      border-bottom: 2px solid ${COLORS.ACCENT};
    }
    
    .ingredients-list {
      list-style: none;
    }
    
    .ingredient-item {
      padding: 3px 0;
      font-size: 8pt;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    
    .ingredient-name {
      font-weight: 500;
      flex: 1;
    }
    
    .ingredient-amount {
      color: ${COLORS.TEXT_SECONDARY};
      white-space: nowrap;
      margin-left: 6px;
      font-weight: 600;
    }
    
    .ingredient-group {
      margin-bottom: 8px;
    }
    
    .group-title {
      font-size: 9pt;
      font-weight: 600;
      color: ${COLORS.ACCENT};
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    .instructions-list {
      list-style: none;
      counter-reset: step-counter;
    }
    
    .instruction-step {
      counter-increment: step-counter;
      margin-bottom: 8px;
      display: flex;
      gap: 8px;
      font-size: 8pt;
      break-inside: avoid;
    }
    
    .step-number {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: ${COLORS.ACCENT};
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 9pt;
    }
    
    .step-number::before {
      content: counter(step-counter);
    }
    
    .step-content {
      flex: 1;
      padding-top: 1px;
    }
    
    .nutrition-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      margin-top: 8px;
    }
    
    .nutrition-item {
      text-align: center;
      padding: 6px;
      background: ${COLORS.SILVER_LIGHTER};
      border-radius: 6px;
    }
    
    .nutrition-value {
      font-size: 12pt;
      font-weight: 700;
      color: ${COLORS.TEXT_PRIMARY};
    }
    
    .nutrition-label {
      font-size: 7pt;
      color: ${COLORS.TEXT_SECONDARY};
      margin-top: 1px;
    }
    
    .page-footer {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 2px solid ${COLORS.SILVER_LIGHTER};
      text-align: center;
      font-size: 7pt;
      color: ${COLORS.TEXT_SECONDARY};
    }
    
    /* Fortsetzungsseiten */
    .continuation-header {
      display: none;
      text-align: center;
      font-size: 10pt;
      font-weight: 600;
      color: ${COLORS.TEXT_SECONDARY};
      padding: 8px 0;
      border-bottom: 2px solid ${COLORS.SILVER_LIGHTER};
      margin-bottom: 12px;
    }
    
    @media print {
      .continuation-header {
        display: block;
      }
      
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      
      .instruction-step {
        page-break-inside: avoid;
      }
      
      .ingredient-group {
        page-break-inside: avoid;
      }
      
      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="page-header">
    <h1 class="recipe-title">${recipe.title}</h1>
    ${recipe.description ? `<p class="recipe-subtitle">${recipe.description}</p>` : ''}
    <div class="recipe-meta">
      ${recipe.servings ? `<span class="meta-badge accent">${recipe.servings} Portionen</span>` : ''}
      ${totalTime > 0 ? `<span class="meta-badge">⏱ ${totalTime} Min</span>` : ''}
      ${recipe.difficulty ? `<span class="meta-badge">${DIFFICULTY_LABELS[recipe.difficulty]}</span>` : ''}
      ${mealCategory ? `<span class="meta-badge">${mealCategory.name}</span>` : ''}
      ${gangCategory ? `<span class="meta-badge">${gangCategory.name}</span>` : ''}
      ${cuisineCategory ? `<span class="meta-badge">🌍 ${cuisineCategory.name}</span>` : ''}
    </div>
  </div>

  <div class="content-grid">
    <div>
      <div class="section">
        <h2 class="section-title">Zutaten</h2>
        ${renderIngredients(recipe)}
      </div>
      
      ${recipe.nutrition_per_serving ? `
        <div class="section">
          <h2 class="section-title">Nährwerte</h2>
          <p style="font-size: 7pt; color: ${COLORS.TEXT_SECONDARY}; margin-bottom: 6px;">Pro Portion</p>
          <div class="nutrition-grid">
            ${recipe.nutrition_per_serving.calories_kcal ? `
              <div class="nutrition-item">
                <div class="nutrition-value">${recipe.nutrition_per_serving.calories_kcal}</div>
                <div class="nutrition-label">kcal</div>
              </div>
            ` : ''}
            ${recipe.nutrition_per_serving.protein_g ? `
              <div class="nutrition-item">
                <div class="nutrition-value">${recipe.nutrition_per_serving.protein_g}g</div>
                <div class="nutrition-label">Protein</div>
              </div>
            ` : ''}
            ${recipe.nutrition_per_serving.carbs_g ? `
              <div class="nutrition-item">
                <div class="nutrition-value">${recipe.nutrition_per_serving.carbs_g}g</div>
                <div class="nutrition-label">KH</div>
              </div>
            ` : ''}
            ${recipe.nutrition_per_serving.fat_g ? `
              <div class="nutrition-item">
                <div class="nutrition-value">${recipe.nutrition_per_serving.fat_g}g</div>
                <div class="nutrition-label">Fett</div>
              </div>
            ` : ''}
          </div>
        </div>
      ` : ''}
    </div>

    <div>
      <div class="section">
        <h2 class="section-title">Zubereitung</h2>
        ${renderInstructions(recipe)}
      </div>
    </div>
  </div>

  <div class="continuation-header">
    ${recipe.title} (Fortsetzung)
  </div>

  <div class="page-footer">
    Erstellt mit RecipeVault • ID: ${recipe.id}
  </div>

  <script>
    // Automatisch drucken beim Laden
    window.onload = () => {
      window.print();
      // Fenster nach dem Drucken schließen
      setTimeout(() => window.close(), 100);
    };
  </script>
</body>
</html>
  `;

  // Öffne Print-Preview in neuem Fenster
  const printWindow = window.open('', '_blank');
  printWindow.document.write(printContent);
  printWindow.document.close();
};

function renderIngredients(recipe) {
  if (recipe.ingredient_groups && recipe.ingredient_groups.length > 0) {
    return recipe.ingredient_groups.map(group => `
      <div class="ingredient-group">
        <div class="group-title">${group.group_name}</div>
        <ul class="ingredients-list">
          ${group.ingredients.map(ing => `
            <li class="ingredient-item">
              <span class="ingredient-name">${ing.ingredient_name}</span>
              <span class="ingredient-amount">${ing.amount > 0 ? ing.amount + ' ' : ''}${ing.unit}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `).join('');
  } else if (recipe.ingredients && recipe.ingredients.length > 0) {
    return `
      <ul class="ingredients-list">
        ${recipe.ingredients.map(ing => `
          <li class="ingredient-item">
            <span class="ingredient-name">${ing.ingredient_name}</span>
            <span class="ingredient-amount">${ing.amount > 0 ? ing.amount + ' ' : ''}${ing.unit}</span>
          </li>
        `).join('')}
      </ul>
    `;
  }
  return '<p>Keine Zutaten angegeben</p>';
}

function renderInstructions(recipe) {
  if (recipe.instruction_groups && recipe.instruction_groups.length > 0) {
    return recipe.instruction_groups.map(group => `
      <div class="ingredient-group">
        <div class="group-title">${group.group_name}</div>
        <ol class="instructions-list">
          ${group.instructions.map(inst => `
            <li class="instruction-step">
              <div class="step-number"></div>
              <div class="step-content">${inst.step_description}</div>
            </li>
          `).join('')}
        </ol>
      </div>
    `).join('');
  } else if (recipe.instructions && recipe.instructions.length > 0) {
    return `
      <ol class="instructions-list">
        ${recipe.instructions.map(inst => `
          <li class="instruction-step">
            <div class="step-number"></div>
            <div class="step-content">${inst.step_description}</div>
          </li>
        `).join('')}
      </ol>
    `;
  }
  return '<p>Keine Anleitung angegeben</p>';
}