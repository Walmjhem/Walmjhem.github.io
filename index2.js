const branches = {

  all: {
    name: "All Branches",
    products: []
  },

  cebu: {

    name: "Cebu Branch",

    products: [

      {
        name: "iPhone 15 Pro",
        category: "phone",
        quantity: 12,
        price: "₱72,990",
        color: "Black",
        storage: "256GB",
        processor: "A17 Pro",
        display: "6.1-inch OLED",
        battery: "3274mAh",
        camera: "48MP",
        image:
          "https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=1200&auto=format&fit=crop"
      },

      {
        name: "ASUS Vivobook 15",
        category: "laptop",
        quantity: 7,
        price: "₱39,999",
        color: "Silver",
        storage: "512GB SSD",
        processor: "Intel Core i5",
        display: "15.6-inch FHD",
        battery: "42Wh",
        camera: "HD Webcam",
        image:
          "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=1200&auto=format&fit=crop"
      },

      {
        name: "Logitech G102",
        category: "mouse",
        quantity: 20,
        price: "₱1,250",
        color: "Black",
        storage: "N/A",
        processor: "N/A",
        display: "N/A",
        battery: "Wired",
        camera: "N/A",
        image:
          "https://images.unsplash.com/photo-1527814050087-3793815479db?q=80&w=1200&auto=format&fit=crop"
      }

    ]
  },

  manila: {

    name: "Manila Branch",

    products: [

      {
        name: "Samsung S24 Ultra",
        category: "phone",
        quantity: 8,
        price: "₱81,990",
        color: "Titanium Gray",
        storage: "512GB",
        processor: "Snapdragon 8 Gen 3",
        display: "6.8-inch AMOLED",
        battery: "5000mAh",
        camera: "200MP",
        image:
          "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=1200&auto=format&fit=crop"
      },

      {
        name: "Royal Kludge RK61",
        category: "keyboard",
        quantity: 15,
        price: "₱2,500",
        color: "White",
        storage: "N/A",
        processor: "N/A",
        display: "N/A",
        battery: "1450mAh",
        camera: "N/A",
        image:
          "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?q=80&w=1200&auto=format&fit=crop"
      },

      {
        name: "MacBook Air M2",
        category: "laptop",
        quantity: 4,
        price: "₱69,990",
        color: "Midnight",
        storage: "512GB SSD",
        processor: "Apple M2",
        display: "13.6-inch Retina",
        battery: "18 Hours",
        camera: "1080p",
        image:
          "https://images.unsplash.com/photo-1517336714739-489689fd1ca8?q=80&w=1200&auto=format&fit=crop"
      }

    ]
  },

  davao: {

    name: "Davao Branch",

    products: [

      {
        name: "Razer DeathAdder",
        category: "mouse",
        quantity: 13,
        price: "₱2,999",
        color: "Black",
        storage: "N/A",
        processor: "N/A",
        display: "N/A",
        battery: "Wired",
        camera: "N/A",
        image:
          "https://images.unsplash.com/photo-1563297007-0686b7003af7?q=80&w=1200&auto=format&fit=crop"
      },

      {
        name: "Lenovo Legion 5",
        category: "laptop",
        quantity: 5,
        price: "₱74,500",
        color: "Black",
        storage: "1TB SSD",
        processor: "Ryzen 7",
        display: "15.6-inch 144Hz",
        battery: "80Wh",
        camera: "720p",
        image:
          "https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=1200&auto=format&fit=crop"
      },

      {
        name: "iPhone 14",
        category: "phone",
        quantity: 10,
        price: "₱45,990",
        color: "Blue",
        storage: "128GB",
        processor: "A15 Bionic",
        display: "6.1-inch OLED",
        battery: "3279mAh",
        camera: "12MP Dual",
        image:
          "https://images.unsplash.com/photo-1663499482523-1d5b30c3b9df?q=80&w=1200&auto=format&fit=crop"
      }

    ]
  }

};

/*========== COMBINE ALL PRODUCTS ==========*/
branches.all.products = [

  ...branches.cebu.products,
  ...branches.manila.products,
  ...branches.davao.products

];

/*========== VARIABLES ==========*/
const productsContainer =
  document.getElementById("productsContainer");

const branchTitle =
  document.getElementById("branchTitle");

const branchSelect =
  document.getElementById("branchSelect");

const modal =
  document.getElementById("productModal");

let currentCategory = "all";

/*========== SHOW BRANCH ==========*/
function showBranch() {

  const selectedBranch =
    branchSelect.value;

  const branch =
    branches[selectedBranch];

  branchTitle.innerText =
    branch.name;

  displayProducts(branch.products);
}

/*========== DISPLAY PRODUCTS ==========*/
function displayProducts(products) {

  productsContainer.innerHTML = "";

  let filteredProducts = products;

  /* CATEGORY FILTER */
  if (currentCategory !== "all") {

    filteredProducts =
      filteredProducts.filter(product =>
        product.category === currentCategory
      );
  }

  /* SEARCH FILTER */
  const searchValue =
    document
      .getElementById("searchInput")
      .value
      .toLowerCase();

  filteredProducts =
    filteredProducts.filter(product =>
      product.name
        .toLowerCase()
        .includes(searchValue)
    );

  /* NO PRODUCTS */
  if (filteredProducts.length === 0) {

    productsContainer.innerHTML = `
      <h2 style="
        color:white;
        text-align:center;
        width:100%;
      ">
        No products found
      </h2>
    `;

    return;
  }

  /* CREATE CARDS */
  filteredProducts.forEach(product => {

    const card =
      document.createElement("div");

    card.classList.add("product-card");

    card.innerHTML = `

  <div class="stock-badge">
    ${product.quantity} Stocks
  </div>

  <img
    src="${product.image}"
    class="product-image"
  >

  <div class="product-content">

    <h3 class="product-name">
      ${product.name}
    </h3>

    <div class="product-price">
      ${product.price}
    </div>

    <p class="product-detail">
      ${product.processor}
    </p>

    <p class="product-detail">
      ${product.storage}
    </p>

    <p class="product-detail">
      ${product.color}
    </p>

  </div>

`;

    card.onclick = () => openModal(product);

    productsContainer.appendChild(card);
  });
}

/*========== FILTER CATEGORY ==========*/
function filterCategory(category) {

  currentCategory = category;

  document
    .querySelectorAll(".category-btn")
    .forEach(btn => {

      btn.classList.remove("active");

      if (
        btn.innerText.toLowerCase()
        .includes(category)
      ) {

        btn.classList.add("active");
      }
    });

  showBranch();
}

/*========== SEARCH PRODUCTS ==========*/
function searchProducts() {

  showBranch();
}

/*========== OPEN MODAL ==========*/
function openModal(product) {

  modal.style.display = "flex";

  document.getElementById("modalImage").src =
    product.image;

  document.getElementById("modalTitle").innerText =
    product.name;

  document.getElementById("modalQuantity").innerText =
    product.quantity;

  document.getElementById("modalColor").innerText =
    product.color;

  document.getElementById("modalStorage").innerText =
    product.storage;

  document.getElementById("modalProcessor").innerText =
    product.processor;

  document.getElementById("modalDisplay").innerText =
    product.display;

  document.getElementById("modalBattery").innerText =
    product.battery;

  document.getElementById("modalCamera").innerText =
    product.camera;

  /* ADD PRICE TO MODAL */
  if (!document.getElementById("modalPrice")) {

    const priceCard =
      document.createElement("div");

    priceCard.classList.add("spec-card");

    priceCard.innerHTML = `
      <div class="spec-label">
        Price
      </div>

      <div class="spec-value" id="modalPrice">
        ${product.price}
      </div>
    `;

    document
      .querySelector(".spec-grid")
      .prepend(priceCard);

  } else {

    document.getElementById("modalPrice").innerText =
      product.price;
  }
}

/*========== CLOSE MODAL ==========*/
function closeModal() {

  modal.style.display = "none";
}

/*========== CLOSE WHEN CLICK OUTSIDE ==========*/
window.onclick = function(e) {

  if (e.target === modal) {

    closeModal();
  }
};

/*========== INITIAL LOAD ==========*/
showBranch();