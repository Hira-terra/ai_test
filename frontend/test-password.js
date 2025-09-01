const bcrypt = require('bcryptjs');

const hash = '$2b$12$LQv3c1yqBWVHxkd0LQ1UU.VTUxYl8UtXTtXd2mU5eSQBJ8kFlJ8sC';
const password = 'password123';

console.log('Testing password:', password);
console.log('Against hash:', hash);

bcrypt.compare(password, hash).then(result => {
  console.log('Password match:', result);
  if (!result) {
    console.log('Generating new hash for password123...');
    bcrypt.hash(password, 12).then(newHash => {
      console.log('New hash:', newHash);
    });
  }
}).catch(err => console.error('Error:', err));