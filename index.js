const port = process.env.PORT || 4000;
const express = require('express'); 
const app = express(); 
const mongoose = require('mongoose'); 
const jwt = require('jsonwebtoken'); 
const multer = require('multer'); 
const path = require('path'); 
const cors = require('cors'); 
require('dotenv').config();

app.use(express.json());
app.use(cors());

// Database connection with MongoDB
const mongoUri = process.env.MONGODB_URI;

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    console.warn('Server starting without database connection. Check MONGODB_URI.');
  });

app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Image storage Engine
const storage = multer.diskStorage({
  destination: "./upload/images",
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage: storage, })

// Creating upload Endpoint for images
app.use('/images', express.static('upload/images'));
app.post('/upload', upload.single('image'), (req, res) => {
  res.json({
    success: 1,
    image_url: `http://localhost:${port}/images/${req.file.filename}`
  });
});

//Schema for Creating product 
const Product = mongoose.model("Product", { 
  id:{ 
    type: Number, 
    required: true, 
  }, 
  name: { 
    type: String, 
    required: true, 
  }, 
  image: { 
    type: String, 
    required: true, 
  }, 
  category: { 
    type: String, 
    required: true, 
  }, 
  new_price: { 
    type: Number, 
    required: true, 
  }, 
  old_price: { 
    type: Number, 
    required: true, 
  }, 
  date: { 
    type: Date,
    default: Date.now,
   }, 
  available: { 
    type: Boolean,
     default: true, 
    }, 
});

app.post('/addproduct', async (req, res) => { 
  let products= await Product.find({}); 
  let id; 
  if (products.length == 0) { 
    id = 1; 
  } else {
     // let last_product_array=products.slice(-1); 
     // let last_product=last_product_array[0]; 
     // id=last_product.id + 1; 
     id = products[products.length - 1].id + 1; 
    } 
    const newProduct = new Product({
       id: id,
       name: req.body.name, 
       image: req.body.image, 
       category: req.body.category, 
       new_price: req.body.new_price, 
       old_price: req.body.old_price, 
      }); 
      console.log(newProduct); 
      await newProduct.save(); 
      console.log("Product added successfully"); 
      res.json({ 
        success: true, 
        name: req.body.name, 
      }) 
    });


// Delete product
app.delete('/deleteproduct/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deletedProduct = await Product.findOneAndDelete({ id });

    if (!deletedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      deletedProduct,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get all products
app.get('/allproducts', async (req, res) => {
  try {
    const products = await Product.find({});
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// User Schema
const Users = mongoose.model("Users", {
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  cartData: { 
    type: Object, 
    // default: {}, 
  },
  date: { type: Date, default: Date.now },
});

// Signup
app.post('/signup', async (req, res) => {
  let check = await Users.findOne({ email: req.body.email });
  if (check) {
    return res.status(400).json({
      success: false,
      message: "Email already exists",
    });
  }

  const user = new Users({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    cartData: cart,
  });

  await user.save();

  const data = { user: { id: user._id } };
  const token = jwt.sign(data, 'secret_ecom');

  res.json({ success: true, token });
});

// Login
app.post('/login', async (req, res) => {
  let user = await Users.findOne({ email: req.body.email });
  if (!user) {
    return res.status(400).json({
      success: false,
      message: "User not found",
    });
  }

  const passwordCompare = req.body.password === user.password;
  if (!passwordCompare) {
    return res.status(400).json({
      success: false,
      message: "Incorrect password",
    });
  }

  const data = { 
    user: { 
      id: user._id 
    }, 
  };
  const token = jwt.sign(data, 'secret_ecom');

  res.json({ 
    success: true, 
    token 
  });
});

// Creating endpoint for newColection data 
app.get('/newcollection', async (req, res) => { 
  try { 
    let products = await Product.find({}); 
    let newcollection = products.slice(-8); // last 8 products 
    console.log("New collection fetched successfully"); 
    res.json({ success: true, products: newcollection, }); 
  } catch (error) { 
    res.status(500).json({ 
      success: false, 
      message: error.message, 
    }); 
  } 
}); 
// Creating endpoint for popular in women category 
app.get('/popularinwomen', async (req, res) => { 
  try { 
    let products = await Product.find({ category: 'Women' }); 
    let popularInWomen = products.slice(0, 4); // first 4 products 
    console.log("Popular in women category fetched successfully"); 
    res.send(popularInWomen); 
  } catch (error) { 
    res.status(500).json({ 
      success: false, 
      message: error.message, 
    }); 
  } 
});

// Middleware to fetch user
const fetchUser = async (req, res, next) => {
  const token = req.header('auth-token');
  if (!token) {
    return res.status(401).send({
      error: "Please authenticate using a valid token",
    });
  }else{
    try {
      const data = jwt.verify(token, 'secret_ecom');
      req.user = data.user;
      next();
    } catch (error) {
      return res.status(401).send({
        error: "Please authenticate using a valid token",
      });
    }
  }
};

//Creating endpoint for adding products in cartData 
app.post('/addtocart', fetchUser, async (req, res) => { 
  try { 
    console.log("Body:", req.body); 
    console.log("User:", req.user); 
    // Example logic (adjust to your schema) 
    const userData = await Users.findOne({ _id: req.user.id }); 
    userData.cartData[req.body.itemId] += 1; 
    await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData }); 
    await userData.save(); 
    res.send("Added to cart successfully"); 
  } catch (error) { 
    res.status(500).json({ success: false, message: error.message, }); 
  } 
});

// Remove from cart
app.post('/removefromcart', fetchUser, async (req, res) => {
  try {
    const userData = await Users.findOne({ _id: req.user.id });

    if (userData.cartData[req.body.itemId] > 0) {
      userData.cartData[req.body.itemId] -= 1;
    }

    await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });

    await userData.save();
    res.send("Removed from cart successfully");

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});