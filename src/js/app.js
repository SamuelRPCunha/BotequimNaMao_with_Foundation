import $ from 'jquery';
import 'what-input';
import 'foundation-sites/dist/css/foundation.min.css';
import '../css/app.css'; // Seu CSS customizado
import { Foundation } from 'foundation-sites';

window.$ = window.jQuery = $;
Foundation.addToJquery($);

document.addEventListener('DOMContentLoaded', () => {
  $(document).foundation();

  initHeader();

  const displayHomeHours = document.getElementById('display-home-hours');
  if (displayHomeHours) {
    let hoursStr = "Não informado";
    try { 
      const hours = JSON.parse(localStorage.getItem('botequim_hours'));
      if(hours) hoursStr = `${hours.days} das ${hours.open} às ${hours.close}`;
    } catch(e){}
    displayHomeHours.textContent = hoursStr;
  }

  if (document.getElementById('page-login')) initLogin();
  if (document.getElementById('page-cardapio')) initCardapio();
  if (document.getElementById('page-gestao')) initGestao();
  if (document.getElementById('page-produto')) initProduto();
  if (document.getElementById('page-carrinho')) initCarrinho();

  checkCartPresence();
});

function checkCartPresence() {
  if (document.getElementById('page-carrinho')) return;
  if (getCartCount() > 0) {
    showFloatingCart();
  }
}

/* ================= HELPER: DATA FETCHING ================= */
async function fetchRecipes() {
  const localData = localStorage.getItem('botequim_recipes');
  if (localData) return JSON.parse(localData);

  const res = await fetch('./data/recipes.json');
  const data = await res.json();
  localStorage.setItem('botequim_recipes', JSON.stringify(data));
  return data;
}

/* ================= HEADER LOGIC ================= */
function initHeader() {
  const sessionRaw = localStorage.getItem('botequim_session');
  let session = null;
  try { session = sessionRaw ? JSON.parse(sessionRaw) : null; } catch(e){}

  const navContainer = document.querySelector('#navMenu');
  
  if (navContainer && session) {
    navContainer.innerHTML = `
      <li><span class="text-muted fw-bold" style="padding: 0.7rem 1rem;">Olá, ${session.name.split(' ')[0]}</span></li>
      ${session.role === 'admin' ? '<li><a href="gestao.html" class="button hollow secondary" style="margin-bottom:0;">Gestão</a></li>' : ''}
      <li><button id="btn-logout" class="button alert" style="margin-bottom:0;">Sair</button></li>
      <li><a href="index.html" class="button hollow primary" style="margin-bottom:0;">Home</a></li>
      <li><a href="cardapio.html" class="button hollow primary" style="margin-bottom:0;">Cardápio</a></li>
    `;
    
    document.getElementById('btn-logout').addEventListener('click', () => {
      localStorage.removeItem('botequim_session');
      window.location.reload();
    });
  }

  const header = document.querySelector('.top-bar');
  if (header && !document.getElementById('status-banner')) {
    const isManualOverrideOff = localStorage.getItem('botequim_status') === 'false';
    const savedHours = JSON.parse(localStorage.getItem('botequim_hours') || 'null');
    
    let isBarOpen = false;
    let overrideReason = false;
    
    if (isManualOverrideOff) {
      isBarOpen = false;
      overrideReason = true;
    } else {
      isBarOpen = checkIsOpenNow(savedHours);
    }

    const statusBanner = document.createElement('div');
    statusBanner.id = 'status-banner';
    statusBanner.className = `callout text-center fw-bold text-white shadow-sm`;
    statusBanner.style.fontSize = '0.9rem';
    statusBanner.style.marginBottom = '0';
    statusBanner.style.border = 'none';
    statusBanner.style.backgroundColor = isBarOpen ? '#198754' : (overrideReason ? '#212529' : '#dc3545');

    let hoursText = savedHours ? ` | Horários: ${savedHours.days}, das ${savedHours.open} às ${savedHours.close}` : '';
    
    if (isBarOpen) {
      statusBanner.innerHTML = `🟢 Botequim Aberto!${hoursText}`;
    } else if (overrideReason) {
      statusBanner.innerHTML = `⚠️ Botequim Fechado para imprevistos hoje.${hoursText}`;
    } else {
      statusBanner.innerHTML = `🔴 Botequim Fechado no momento.${hoursText}`;
    }

    header.parentNode.insertBefore(statusBanner, header);
  }
}

/* ================= HORÁRIOS LOGIC ================= */
function checkIsOpenNow(savedHours) {
  if (!savedHours || !savedHours.daysArray || !savedHours.open || !savedHours.close) return true;

  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const [openH, openM] = savedHours.open.split(':').map(Number);
  const openTime = openH * 60 + openM;
  const [closeH, closeM] = savedHours.close.split(':').map(Number);
  const closeTime = closeH * 60 + closeM;

  const isOvernight = closeTime <= openTime;

  if (savedHours.daysArray.includes(currentDay)) {
    if (!isOvernight) {
      if (currentTime >= openTime && currentTime <= closeTime) return true;
    } else {
      if (currentTime >= openTime || currentTime <= closeTime) return true;
    }
  }

  if (isOvernight && currentTime <= closeTime) {
    const yesterday = currentDay === 0 ? 6 : currentDay - 1;
    if (savedHours.daysArray.includes(yesterday)) return true;
  }
  return false;
}

/* ================= LOGIN LOGIC ================= */
function initLogin() {
  const form = document.getElementById('form-login');
  const title = document.getElementById('login-title');
  const subtitle = document.getElementById('login-subtitle');
  const btnSubmit = document.getElementById('btn-submit');
  const toggleText = document.getElementById('toggle-text');
  const toggleBtn = document.getElementById('toggle-btn');
  const nameGroup = document.getElementById('group-name');

  const $modal = $('#modal');
  const modalMsg = document.getElementById('modal-msg');
  let modalAction = null;
  let isLogin = true;

  toggleBtn.addEventListener('click', () => {
    isLogin = !isLogin;
    if (isLogin) {
      title.textContent = 'Acesse sua conta';
      subtitle.textContent = 'Bem-vindo de volta! Por favor, insira seus dados.';
      btnSubmit.textContent = 'Entrar';
      toggleText.textContent = 'Não tem uma conta?';
      toggleBtn.textContent = 'Cadastre-se';
      nameGroup.style.display = 'none';
      document.getElementById('input-name').required = false;
    } else {
      title.textContent = 'Crie sua conta';
      subtitle.textContent = 'Preencha os dados abaixo para começar.';
      btnSubmit.textContent = 'Cadastrar';
      toggleText.textContent = 'Já tem uma conta?';
      toggleBtn.textContent = 'Entrar';
      nameGroup.style.display = 'block';
      document.getElementById('input-name').required = true;
    }
  });

  function showModal(msg, action = null) {
    modalMsg.textContent = msg;
    modalAction = action;
    $modal.foundation('open');
  }

  $modal.on('closed.zf.reveal', () => {
    if (modalAction) {
      modalAction();
      modalAction = null;
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('input-name').value;
    const email = document.getElementById('input-email').value;
    const password = document.getElementById('input-password').value;

    if (isLogin) {
      if (email === 'admin' && password === 'admin') {
        const adminUser = { name: 'Administrador', email: 'admin', role: 'admin' };
        localStorage.setItem('botequim_session', JSON.stringify(adminUser));
        showModal('Login de Administrador realizado!', () => window.location.href = 'gestao.html');
        return;
      }
      const users = JSON.parse(localStorage.getItem('botequim_users') || '[]');
      const user = users.find(u => u.email === email && u.password === password);
      if (user) {
        localStorage.setItem('botequim_session', JSON.stringify(user));
        showModal(`Bem-vindo(a), ${user.name}!`, () => window.location.href = 'index.html');
      } else {
        showModal('E-mail ou senha incorretos.');
      }
    } else {
      if (!name || !email || !password) {
        showModal('Preencha todos os campos.');
        return;
      }
      const users = JSON.parse(localStorage.getItem('botequim_users') || '[]');
      if (users.some(u => u.email === email)) {
        showModal('Este e-mail já está cadastrado.');
        return;
      }
      const newUser = { name, email, password };
      users.push(newUser);
      localStorage.setItem('botequim_users', JSON.stringify(users));
      localStorage.setItem('botequim_session', JSON.stringify(newUser));
      showModal('Conta criada com sucesso!', () => window.location.href = 'index.html');
    }
  });
}

/* ================= GESTAO LOGIC ================= */
async function initGestao() {
  const container = document.getElementById('stock-container');
  const containerDrinks = document.getElementById('drinks-list-container');
  
  try {
    const sessionRaw = localStorage.getItem('botequim_session');
    let session = null;
    try { session = sessionRaw ? JSON.parse(sessionRaw) : null; } catch(e){}
    
    if (!session || session.role !== 'admin') {
      window.location.href = 'login.html';
      return;
    }

    const data = await fetchRecipes();
    renderStockManagement(data);
    renderDrinksManagement(data);

    $('#gestao-tabs').on('change.zf.tabs', async function() {
      const activeTabId = $(this).find('.is-active a').attr('href');
      if(activeTabId === '#tab-drinks') {
        const freshData = await fetchRecipes();
        renderDrinksManagement(freshData);
      } else if (activeTabId === '#tab-orders') {
        renderOrders();
      }
    });

    const formAdd = document.getElementById('form-add-drink');
    if (formAdd) {
      formAdd.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('new-name').value;
        const desc = document.getElementById('new-desc').value;
        const ingredientsStr = document.getElementById('new-ingredients').value;
        const imageInput = document.getElementById('new-image');
        let imageSrc = './images/geral/header/logo_botequim_na_mao_1.png';

        if (imageInput && imageInput.files && imageInput.files[0]) {
          const file = imageInput.files[0];
          imageSrc = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
          });
        }

        const ingredientsList = ingredientsStr.split(',').map(i => i.trim()).filter(i => i);
        const recipes = await fetchRecipes();
        const newRecipe = { id: Date.now(), name, description: desc, ingredientsNeeded: ingredientsList, image: imageSrc };
        
        recipes.push(newRecipe);
        localStorage.setItem('botequim_recipes', JSON.stringify(recipes));
        
        renderStockManagement(recipes);
        renderDrinksManagement(recipes);
        
        $('#modal-add-drink').foundation('close');
        formAdd.reset();
        showAdminToast('Bebida adicionada com sucesso!');
      });
    }
  } catch (err) {
    console.error(err);
  }

  function renderStockManagement(receitas) {
    const todosIngredientes = new Set();
    receitas.forEach(r => r.ingredientsNeeded.forEach(ing => todosIngredientes.add(ing)));
    const ingredientesOrdenados = Array.from(todosIngredientes).sort();

    let currentStock = JSON.parse(localStorage.getItem('botequim_stock'));
    if (!currentStock) {
      currentStock = ingredientesOrdenados;
      localStorage.setItem('botequim_stock', JSON.stringify(currentStock));
    }

    container.innerHTML = '';
    ingredientesOrdenados.forEach(ing => {
      const isChecked = currentStock.includes(ing);
      const safeId = "switch-" + ing.replace(/\s+/g, '-');
      const item = document.createElement('div');
      item.className = 'flex-container align-justify align-middle bg-light';
      item.style.padding = '1rem';
      item.style.borderRadius = '1rem';
      item.style.border = '1px solid #e6e6e6';
      
      item.innerHTML = `
        <span class="fw-bold text-dark">${ing}</span>
        <div class="switch" style="margin-bottom:0;">
          <input class="switch-input" id="${safeId}" type="checkbox" value="${ing}" ${isChecked ? 'checked' : ''}>
          <label class="switch-paddle" for="${safeId}">
            <span class="show-for-sr">${ing}</span>
          </label>
        </div>
      `;

      item.querySelector('input').addEventListener('change', (e) => {
        if (e.target.checked) currentStock.push(ing);
        else currentStock = currentStock.filter(i => i !== ing);
        currentStock = [...new Set(currentStock)];
        localStorage.setItem('botequim_stock', JSON.stringify(currentStock));
      });
      container.appendChild(item);
    });
  }

  function renderDrinksManagement(receitas) {
    if (!containerDrinks) return;
    containerDrinks.innerHTML = '';
    receitas.forEach(receita => {
      const item = document.createElement('div');
      item.className = 'flex-container align-justify align-middle bg-light';
      item.style.padding = '1rem';
      item.style.borderRadius = '1rem';
      item.style.border = '1px solid #e6e6e6';

      item.innerHTML = `
        <span class="fw-bold text-dark">${receita.name}</span>
        <button class="button alert tiny rounded-circle btn-delete" style="margin-bottom:0; width: 35px; height: 35px; padding:0; display:flex; align-items:center; justify-content:center;" title="Remover">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      `;

      item.querySelector('.btn-delete').addEventListener('click', async () => {
        if (confirm(`Remover "${receita.name}"?`)) {
          const currentRecipes = await fetchRecipes();
          const updatedRecipes = currentRecipes.filter(r => r.id !== receita.id);
          localStorage.setItem('botequim_recipes', JSON.stringify(updatedRecipes));
          renderDrinksManagement(updatedRecipes);
          renderStockManagement(updatedRecipes);
        }
      });
      containerDrinks.appendChild(item);
    });
  }

  const switchStatusBar = document.getElementById('switch-status-bar');
  const labelStatusBar = document.getElementById('label-status-bar');
  const descStatusBar = document.getElementById('desc-status-bar');

  if (switchStatusBar && labelStatusBar && descStatusBar) {
    const isBarOpen = JSON.parse(localStorage.getItem('botequim_status') !== null ? localStorage.getItem('botequim_status') : 'true');
    switchStatusBar.checked = isBarOpen;
    updateStatusBarUI(isBarOpen);

    switchStatusBar.addEventListener('change', (e) => {
      const isOpen = e.target.checked;
      localStorage.setItem('botequim_status', JSON.stringify(isOpen));
      updateStatusBarUI(isOpen);
      showAdminToast(isOpen ? 'Automático Ativado!' : 'Fechamento Ativado!');
      const oldBanner = document.getElementById('status-banner');
      if (oldBanner) oldBanner.remove();
      initHeader();
    });
  }

  function updateStatusBarUI(isOpen) {
    if (isOpen) {
      labelStatusBar.textContent = 'Funcionamento Automático';
      labelStatusBar.style.color = '#198754';
      descStatusBar.textContent = 'O sistema abre e fecha de acordo com a tabela.';
    } else {
      labelStatusBar.textContent = 'Fechamento Forçado';
      labelStatusBar.style.color = '#dc3545';
      descStatusBar.textContent = 'Atenção: O Botequim está fechado para todos os clientes!';
    }
  }

  const formBusinessHours = document.getElementById('form-business-hours');
  if (formBusinessHours) {
    const inputDays = document.getElementById('input-days');
    const inputOpen = document.getElementById('input-time-open');
    const inputClose = document.getElementById('input-time-close');

    const savedHours = JSON.parse(localStorage.getItem('botequim_hours') || 'null');
    if (savedHours) {
      if (savedHours.days) inputDays.value = savedHours.days;
      if (savedHours.open) inputOpen.value = savedHours.open;
      if (savedHours.close) inputClose.value = savedHours.close;
      if (savedHours.daysArray) {
        savedHours.daysArray.forEach(d => {
          const cb = document.getElementById(`day-${d}`);
          if (cb) cb.checked = true;
        });
      }
    }

    formBusinessHours.addEventListener('submit', (e) => {
      e.preventDefault();
      const checkedBoxes = Array.from(document.querySelectorAll('#input-days-checkboxes input[type="checkbox"]:checked'));
      const daysArray = checkedBoxes.map(cb => parseInt(cb.value, 10));

      const hoursData = { days: inputDays.value, daysArray: daysArray, open: inputOpen.value, close: inputClose.value };
      localStorage.setItem('botequim_hours', JSON.stringify(hoursData));
      showAdminToast('Horários salvos!');
      
      const oldBanner = document.getElementById('status-banner');
      if (oldBanner) oldBanner.remove();
      initHeader();
    });
  }

  function showAdminToast(message) {
    const existing = document.querySelector('.toast-callout');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast-callout callout success shadow-sm rounded-4 text-center';
    toast.style.display = 'block';
    toast.innerHTML = `<strong>${message}</strong>`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      $(toast).fadeOut(400, function() { $(this).remove(); });
    }, 3000);
  }

  function renderOrders() {
    const ordersContainer = document.getElementById('orders-container');
    if (!ordersContainer) return;
    
    const orders = JSON.parse(localStorage.getItem('botequim_orders') || '[]');
    ordersContainer.innerHTML = '';
    
    if (orders.length === 0) {
      ordersContainer.innerHTML = '<div class="cell small-12 text-center py-5 text-muted">Nenhum pedido no momento.</div>';
      return;
    }
    
    orders.reverse().forEach((order, index) => {
      const realIndex = orders.length - 1 - index;
      const orderDate = new Date(order.date);
      const timeStr = orderDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      
      let badgeClass = 'secondary';
      let badgeText = 'Pendente';
      if (order.status === 'preparando') { badgeClass = 'warning'; badgeText = 'Em Preparação'; }
      else if (order.status === 'feito') { badgeClass = 'success'; badgeText = 'Finalizado'; }
      
      const itemsHtml = order.items.map(item => `<li><strong>${item.quantity}x</strong> ${item.name}</li>`).join('');
      
      const card = document.createElement('div');
      card.className = 'cell small-12 medium-6 large-4';
      card.innerHTML = `
        <div class="callout shadow-sm rounded-4" style="border: 1px solid #e6e6e6; ${order.status === 'feito' ? 'opacity:0.7;' : ''}">
          <div class="flex-container align-justify align-middle" style="margin-bottom: 1rem;">
            <h6 class="fw-bold mb-0 text-muted">#${order.id.toString().slice(-4)}</h6>
            <span class="label ${badgeClass}">${badgeText}</span>
          </div>
          <p class="mb-1 fw-bold fs-5 text-primary">${order.user}</p>
          <p class="small text-muted mb-3">🕒 Feito às ${timeStr}</p>
          <ul class="small mb-4 text-dark" style="padding-left:1rem;">${itemsHtml}</ul>
          <div class="grid-x grid-margin-x">
            <div class="cell small-6"><button class="button expanded hollow warning fw-bold" onclick="updateOrderStatus(${realIndex}, 'preparando')" ${order.status === 'feito' ? 'disabled' : ''}>Preparando</button></div>
            <div class="cell small-6"><button class="button expanded success fw-bold" onclick="updateOrderStatus(${realIndex}, 'feito')" ${order.status === 'feito' ? 'disabled' : ''}>Feito</button></div>
          </div>
        </div>
      `;
      ordersContainer.appendChild(card);
    });
  }
  
  window.updateOrderStatus = function(index, newStatus) {
    const orders = JSON.parse(localStorage.getItem('botequim_orders') || '[]');
    if (orders[index]) {
      orders[index].status = newStatus;
      localStorage.setItem('botequim_orders', JSON.stringify(orders));
      renderOrders();
    }
  };
}

/* ================= CARDAPIO LOGIC ================= */
function initCardapio() {
  const container = document.getElementById('cards-container');
  const inputBusca = document.getElementById('input-busca');
  const inputBuscaMobile = document.getElementById('input-busca-mobile');
  const areaFiltroElement = document.getElementById('area-filtro');
  const btnToggleFiltro = document.getElementById('btn-toggle-filtro');
  const btnToggleFiltroMobile = document.getElementById('btn-toggle-filtro-mobile');
  const listaIngredientesContainer = document.getElementById('lista-ingredientes');
  const btnLimpar = document.getElementById('btn-limpar-filtros');

  let allRecipes = [];
  let selectedIngredients = [];

  const toggleFilter = () => $(areaFiltroElement).slideToggle();
  if(btnToggleFiltro) btnToggleFiltro.addEventListener('click', toggleFilter);
  if(btnToggleFiltroMobile) btnToggleFiltroMobile.addEventListener('click', toggleFilter);

  const applySearch = (e) => { applyFilters(); };
  if(inputBusca) inputBusca.addEventListener('input', applySearch);
  if(inputBuscaMobile) inputBuscaMobile.addEventListener('input', applySearch);

  btnLimpar.addEventListener('click', () => {
    selectedIngredients = [];
    document.querySelectorAll('.btn-ingrediente').forEach(btn => {
      btn.classList.remove('primary');
      btn.classList.add('hollow', 'secondary');
    });
    applyFilters();
  });

  fetchRecipes().then(data => {
    allRecipes = data;
    generateIngredientButtons(data);
    renderCards(allRecipes);
  }).catch(err => {
    container.innerHTML = '<div class="cell small-12 text-center text-danger">Erro ao carregar receitas.</div>';
    console.error(err);
  });

  function generateIngredientButtons(receitas) {
    const todosIngredientes = new Set();
    receitas.forEach(r => r.ingredientsNeeded.forEach(ing => todosIngredientes.add(ing)));
    const ingredientesOrdenados = Array.from(todosIngredientes).sort();

    listaIngredientesContainer.innerHTML = '';
    ingredientesOrdenados.forEach(ing => {
      const btn = document.createElement('button');
      btn.className = 'button hollow secondary tiny fw-bold btn-ingrediente';
      btn.style.marginRight = '0.5rem';
      btn.style.marginBottom = '0.5rem';
      btn.style.borderRadius = '50rem';
      btn.textContent = ing;

      btn.addEventListener('click', () => {
        if (selectedIngredients.includes(ing)) {
          selectedIngredients = selectedIngredients.filter(i => i !== ing);
          btn.classList.remove('primary');
          btn.classList.add('hollow', 'secondary');
        } else {
          selectedIngredients.push(ing);
          btn.classList.remove('hollow', 'secondary');
          btn.classList.add('primary');
        }
        applyFilters();
      });
      listaIngredientesContainer.appendChild(btn);
    });
  }

  function applyFilters() {
    const valLarge = inputBusca ? inputBusca.value.toLowerCase() : '';
    const valSmall = inputBuscaMobile ? inputBuscaMobile.value.toLowerCase() : '';
    const termoBusca = valLarge || valSmall;

    const filtrados = allRecipes.filter(receita => {
      const matchNome = receita.name.toLowerCase().includes(termoBusca);
      const matchIngredientes = selectedIngredients.every(sel => receita.ingredientsNeeded.includes(sel));
      return matchNome && matchIngredientes;
    });

    renderCards(filtrados);
  }

  function renderCards(receitas) {
    container.innerHTML = '';
    if (receitas.length === 0) {
      container.innerHTML = '<div class="cell small-12 text-center py-5 text-muted">Nenhum drink encontrado com esses critérios.</div>';
      return;
    }

    receitas.forEach(receita => {
      const card = document.createElement('div');
      card.className = 'cell small-12 medium-6 large-4';

      const ingredientesHTML = receita.ingredientsNeeded.map(ing => `<span class="label secondary">${ing}</span>`).join(' ');

      card.innerHTML = `
        <div class="card" style="cursor:pointer; height: 100%; border-radius: 1rem; overflow: hidden; border: 1px solid #e6e6e6;" onclick="window.location.href='produto.html?id=${receita.id}'">
          <img src="${receita.image}" alt="${receita.name}" style="height: 250px; object-fit: cover; width: 100%;">
          <div class="card-section">
            <h4 class="h5 fw-bold text-dark mb-2">${receita.name}</h4>
            <p class="text-muted small mb-3" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${receita.description}
            </p>
            <div style="margin-bottom: 1rem;">${ingredientesHTML}</div>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }
}

/* ================= PRODUTO LOGIC ================= */
async function initProduto() {
  const container = document.getElementById('product-container');
  const urlParams = new URLSearchParams(window.location.search);
  const productId = parseInt(urlParams.get('id'), 10);

  if (!productId) {
    container.innerHTML = '<div class="text-center py-5"><h2 class="h4 text-danger">Produto não encontrado.</h2></div>';
    return;
  }

  try {
    const allRecipes = await fetchRecipes();
    const recipe = allRecipes.find(r => r.id === productId);

    if (!recipe) {
      container.innerHTML = '<div class="text-center py-5"><h2 class="h4 text-danger">Produto não encontrado.</h2></div>';
      return;
    }

    const ingredientesHTML = recipe.ingredientsNeeded.map(ing => `<span class="label secondary large">${ing}</span>`).join(' ');

    container.innerHTML = `
      <div class="grid-x grid-margin-x align-middle">
        <div class="cell small-12 medium-6 text-center">
          <img src="${recipe.image}" alt="${recipe.name}" class="rounded-4 shadow-sm" style="max-height: 550px; width: 100%; object-fit: cover; margin-bottom: 2rem;">
        </div>
        <div class="cell small-12 medium-6">
          <h1 class="fw-bold mb-3 text-primary" style="font-size:3rem;">${recipe.name}</h1>
          <p class="lead text-muted mb-4">${recipe.description}</p>
          <h3 class="h5 fw-bold mb-3 text-dark">Ingredientes Necessários:</h3>
          <div class="flex-container flex-wrap" style="gap: 0.5rem; margin-bottom: 1.5rem;">${ingredientesHTML}</div>
          <button id="btn-add-cart" class="button primary large expanded fw-bold rounded-pill">
            🛒 Adicionar ao Carrinho
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-add-cart').addEventListener('click', () => {
      const sessionRaw = localStorage.getItem('botequim_session');
      if (!sessionRaw) {
        alert('Você precisa estar logado para adicionar itens ao carrinho!');
        window.location.href = 'login.html';
        return;
      }
      addToCart(recipe);
      showFloatingCart();
      const btn = document.getElementById('btn-add-cart');
      btn.innerHTML = '✓ Adicionado ao Carrinho!';
      btn.classList.remove('primary');
      btn.classList.add('success');
      setTimeout(() => {
        btn.innerHTML = '🛒 Adicionar Mais ao Carrinho';
        btn.classList.remove('success');
        btn.classList.add('primary');
      }, 2000);
    });
  } catch (err) {
    console.error(err);
  }
}

/* ================= CART LOGIC ================= */
function getCart() { return JSON.parse(localStorage.getItem('botequim_cart') || '[]'); }

// Data atual em formato YYYY-MM-DD
function getTodayDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ================= ACCESSIBILITY LOGIC ================= */
function initAccessibility() {
  // Inicializa o estado com base no LocalStorage
  const isDark = localStorage.getItem('botequim_theme') === 'dark';
  if (isDark) document.body.classList.add('dark-theme');

  let fontSize = parseInt(localStorage.getItem('botequim_fontSize')) || 100;
  document.documentElement.style.fontSize = fontSize + '%';

  // Configura os botões em todas as páginas (caso existam)
  const btnTheme = document.querySelectorAll('.btn-toggle-theme');
  const btnFont = document.querySelectorAll('.btn-increase-font');

  btnTheme.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const currentIsDark = document.body.classList.toggle('dark-theme');
      localStorage.setItem('botequim_theme', currentIsDark ? 'dark' : 'light');
    });
  });

  btnFont.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      fontSize += 10;
      if (fontSize > 120) fontSize = 100; // Loop: 100 -> 110 -> 120 -> 100
      document.documentElement.style.fontSize = fontSize + '%';
      localStorage.setItem('botequim_fontSize', fontSize);
    });
  });
}

// Inicializar acessibilidade assim que o script rodar
initAccessibility();

function addToCart(recipe) {
  const cart = getCart();
  const existing = cart.find(item => item.id === recipe.id);
  if (existing) existing.quantity += 1;
  else cart.push({ ...recipe, quantity: 1 });
  localStorage.setItem('botequim_cart', JSON.stringify(cart));
}

function getCartCount() { return getCart().reduce((total, item) => total + item.quantity, 0); }

function showFloatingCart() {
  let btn = document.getElementById('floating-cart');
  if (!btn) {
    btn = document.createElement('a');
    btn.id = 'floating-cart';
    btn.href = 'carrinho.html';
    btn.className = 'button primary flex-container align-middle align-center';
    btn.style.borderRadius = '50%';
    btn.style.position = 'fixed';
    btn.style.bottom = '30px';
    btn.style.right = '30px';
    btn.style.width = '65px';
    btn.style.height = '65px';
    btn.style.zIndex = '1050';
    btn.style.margin = '0';
    document.body.appendChild(btn);
  }
  btn.innerHTML = `
    <span style="font-size:1.5rem;">🛒</span>
    <span class="badge alert" style="position:absolute; top: -5px; right: -5px;">${getCartCount()}</span>
  `;
}

/* ================= CARRINHO LOGIC ================= */
function initCarrinho() {
  const container = document.getElementById('cart-container');
  const sessionRaw = localStorage.getItem('botequim_session');

  if (!sessionRaw) {
    container.innerHTML = `
      <h2 class="h4 text-danger mb-3">Acesso Negado</h2>
      <p class="text-muted mb-4">Você precisa estar logado para ver o seu carrinho.</p>
      <a href="login.html" class="button primary px-4 fw-bold">Fazer Login</a>
    `;
    return;
  }

  const cart = getCart();
  if (cart.length === 0) {
    container.innerHTML = `
      <h2 class="h5 text-muted mb-3" style="margin-top:2rem;">Seu carrinho está vazio</h2>
      <a href="cardapio.html" class="button hollow primary px-4 fw-bold">Explorar Cardápio</a>
    `;
    return;
  }

  let html = '<div class="grid-y gap-2 mb-4">';
  cart.forEach(item => {
    html += `
      <div class="callout flex-container align-middle" style="gap: 1rem; border:1px solid #e6e6e6; padding: 1rem; margin-bottom: 1rem; text-align: left;">
        <img src="${item.image}" alt="${item.name}" class="rounded-4" style="width: 80px; height: 80px; object-fit: cover;">
        <div style="flex-grow:1;">
          <h5 class="mb-1 fw-bold text-dark">${item.name}</h5>
          <span class="label secondary">Quantidade: ${item.quantity}</span>
        </div>
      </div>
    `;
  });
  html += '</div><div class="text-right"><button id="btn-checkout" class="button success large fw-bold rounded-pill">Finalizar Pedido</button></div>';

  container.innerHTML = html;
  container.style.textAlign = 'left';

  document.getElementById('btn-checkout').addEventListener('click', () => {
    const orders = JSON.parse(localStorage.getItem('botequim_orders') || '[]');
    const userSession = JSON.parse(sessionRaw);
    orders.push({
      id: Date.now(),
      user: userSession.name,
      items: getCart(),
      status: 'pendente',
      date: new Date().toISOString()
    });
    localStorage.setItem('botequim_orders', JSON.stringify(orders));
    localStorage.removeItem('botequim_cart');
    
    container.innerHTML = `
      <div class="text-center py-5">
        <h2 class="h3 text-success mb-3 fw-bold">Pedido Realizado! 🎉</h2>
        <p class="text-muted mb-4 lead">Seu pedido foi enviado para o balcão e logo será preparado.</p>
        <a href="cardapio.html" class="button primary px-4 fw-bold">Voltar ao Cardápio</a>
      </div>
    `;
    container.style.textAlign = 'center';
    const floating = document.getElementById('floating-cart');
    if (floating) floating.remove();
  });
}
