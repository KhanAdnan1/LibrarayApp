const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const main = async () => {
  const uri = 'mongodb+srv://akbproduct123:akbproduct123@cluster0.xnpbsqm.mongodb.net/library';
  //const dbName = 'library';

  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB Atlas');

    const studentSchema = new mongoose.Schema({
      clas: String,
      user: String,
      password: String,
    });
    const Students = mongoose.model('Students', studentSchema);

    const booksSchema = new mongoose.Schema({
      clas: String,
      title: String,
      isbn: String,
      file: {
        data: Buffer,
        contentType: String,
      },
    });
    const Books = mongoose.model('Books', booksSchema);

    const adminSchema = new mongoose.Schema({
      UserID: String,
      Password: String,
    });
    const Admins = mongoose.model('Admins', adminSchema);

    const server = express();
    server.use(cors());
    server.use(bodyParser.json({ limit: '10mb' }));
    server.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
    
    //static file
    server.use(express.static(path.join(__dirname, './my-app/build')));
    server.get('*', function(req,res){
      res.sendFile(path.join(__dirname,'./my-app/build/index.html'));
    });

    const upload = multer({ dest: 'uploads/' });
    const port = 8080;

    server.post('/demo', upload.single('file'), async (req, res) => {
      try {
        if (req.body.type === 'student') {
          const { clas, user, password } = req.body;
          const saltRounds = 10;
          const hashedPassword = await bcrypt.hash(password, saltRounds);

          
          const existingStudents = await Students.findOne({ clas, user });
          if (existingStudents) {
            return res.status(400).json({ error: 'This Student has been already added' });
          }


          let students = new Students();
          students.clas = clas;
          students.user = user;
          students.password = hashedPassword;
          const studentData = await students.save();
          res.json({ studentData });
        } else if (req.body.type === 'book') {
          const { clas, title } = req.body;
          const existingBook = await Books.findOne({ clas, title });
          if (existingBook) {
            return res.status(400).json({ error: 'This book has been already added' });
          }

          let book = new Books();
          book.clas = req.body.clas;
          book.title = req.body.title;
          book.isbn = req.body.isbn;
          book.file.data = fs.readFileSync(req.file.path);
          book.file.contentType = req.file.mimetype;
          const bookData = await book.save();
          res.json({ bookData });
        } else {
          res.status(400).json({ error: 'Invalid request type' });
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while saving data' });
      }
    });



    // ...
    
      server.post('/login', async (req, res) => {
        try {
          const { UserID, Password } = req.body;

          // Find the user document with the given UserID
          const user = await Admins.findOne({ user: UserID });

          if (!user) {
            return res.json({ success: false });
          }

          // Compare the plain password with the stored password
          if (user.password === Password) {
            
            return res.json({ success: true });
          } else {
            return res.json({ success: false });
          }
        } catch (error) {
          console.error(error);
          res.status(500).json({ error: 'An error occurred while processing the login' });
        }
      });
      

// ...

  //For testing
    server.get('/test', async (req, res) => {
      try {
        const adminData = await Admins.find();
        res.json({ adminData });
        console.log(adminData);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching admin data' });
      }
    });
    

    //For Download a Pdf Book 
    server.get('/books/:title', async (req, res) => {
      try {
        const bookTitle = req.params.title;
        const bookDocument = await Books.findOne({ title: bookTitle });

        if (!bookDocument) {
          return res.status(404).json({ error: 'Book not found' });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${bookTitle}.pdf`);
        res.send(bookDocument.file.data);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while retrieving the book data' });
      }
    });

    server.listen(port, () => {
      console.log('Server running on port', port);
    });

    // Close the connection when the server is stopped
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('Connection to MongoDB Atlas closed');
      process.exit(0);
    });
  } catch (err) {
    console.error('Error connecting to MongoDB Atlas:', err);
  }
};

main().catch(console.error);


