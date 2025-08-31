// Selectors
const toDoInput = document.querySelector('.todo-input');
const toDoBtn = document.querySelector('.todo-btn');
const toDoForm = document.querySelector('form');
const toDoList = document.querySelector('.todo-list');
const standardTheme = document.querySelector('.standard-theme');
const lightTheme = document.querySelector('.light-theme');
const darkerTheme = document.querySelector('.darker-theme');

// Profile elements
const profileBtn = document.getElementById('profile-btn');
const profileDropdown = document.getElementById('profile-dropdown');
const userInfo = document.getElementById('user-info');
const authOptions = document.getElementById('auth-options');
const logoutBtn = document.getElementById('logout-btn');
const showLoginBtn = document.getElementById('show-login-btn');
const showRegisterBtn = document.getElementById('show-register-btn');

// Modal elements
const loginModal = document.getElementById('login-modal');
const registerModal = document.getElementById('register-modal');
const editModal = document.getElementById('edit-modal');
const closeModalBtns = document.querySelectorAll('.close-modal');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const updateTodoBtn = document.getElementById('update-todo-btn');
const editTodoInput = document.getElementById('edit-todo-input');

// Show login/register links
const showRegister = document.getElementById('show-register');
const showLogin = document.getElementById('show-login');

// Current todo being edited
let currentEditTodoId = null;

// Event Listeners
toDoForm.addEventListener('submit', addToDo);
toDoList.addEventListener('click', handleTodoActions);
document.addEventListener("DOMContentLoaded", checkAuthState);
standardTheme.addEventListener('click', () => changeTheme('standard'));
lightTheme.addEventListener('click', () => changeTheme('light'));
darkerTheme.addEventListener('click', () => changeTheme('darker'));

// Profile event listeners
profileBtn.addEventListener('click', toggleProfileDropdown);
document.addEventListener('click', closeProfileDropdown);
logoutBtn.addEventListener('click', logoutUser);
showLoginBtn.addEventListener('click', () => showModal(loginModal));
showRegisterBtn.addEventListener('click', () => showModal(registerModal));

// Modal event listeners
closeModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        hideAllModals();
    });
});

loginBtn.addEventListener('click', loginUser);
registerBtn.addEventListener('click', registerUser);
updateTodoBtn.addEventListener('click', updateTodo);

showRegister.addEventListener('click', () => {
    hideAllModals();
    showModal(registerModal);
});

showLogin.addEventListener('click', () => {
    hideAllModals();
    showModal(loginModal);
});

// Close modals when clicking outside
window.addEventListener('click', (event) => {
    if (event.target.classList.contains('modal')) {
        hideAllModals();
    }
});

// Check if one theme has been set previously and apply it (or std theme if not found):
let savedTheme = localStorage.getItem('savedTheme');
savedTheme === null ?
    changeTheme('standard')
    : changeTheme(localStorage.getItem('savedTheme'));

// Firebase Auth State Observer
function checkAuthState() {
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in
            userInfo.classList.remove('hidden');
            authOptions.classList.add('hidden');
            document.getElementById('user-name').textContent = user.displayName || user.email;
            
            // Load user's todos
            getTodos(user.uid);
        } else {
            // User is signed out
            userInfo.classList.add('hidden');
            authOptions.classList.remove('hidden');
            
            // Clear todos from UI
            toDoList.innerHTML = '';
        }
    });
}

// Profile Functions
function toggleProfileDropdown(event) {
    event.stopPropagation();
    profileDropdown.classList.toggle('hidden');
}

function closeProfileDropdown(event) {
    if (!event.target.closest('#profile-container')) {
        profileDropdown.classList.add('hidden');
    }
}

// Modal Functions
function showModal(modal) {
    hideAllModals();
    modal.classList.remove('hidden');
}

function hideAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
}

// Auth Functions
function loginUser() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        alert('Please enter both email and password');
        return;
    }
    
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Clear input fields and close modal
            document.getElementById('login-email').value = '';
            document.getElementById('login-password').value = '';
            hideAllModals();
        })
        .catch((error) => {
            alert('Login failed: ' + error.message);
        });
}

function registerUser() {
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    if (!name || !email || !password) {
        alert('Please fill all fields');
        return;
    }
    
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Update user profile with name
            return userCredential.user.updateProfile({
                displayName: name
            });
        })
        .then(() => {
            // Clear input fields and close modal
            document.getElementById('register-name').value = '';
            document.getElementById('register-email').value = '';
            document.getElementById('register-password').value = '';
            hideAllModals();
            showModal(loginModal);
        })
        .catch((error) => {
            alert('Registration failed: ' + error.message);
        });
}

function logoutUser() {
    auth.signOut()
        .then(() => {
            profileDropdown.classList.add('hidden');
        })
        .catch((error) => {
            alert('Logout failed: ' + error.message);
        });
}

// Todo Functions
function addToDo(event) {
    event.preventDefault(); // Prevent form submission

    const user = auth.currentUser;
    if (!user) {
        alert('Please login to add tasks');
        showModal(loginModal);
        return;
    }

    if (toDoInput.value === '') {
        alert("You must write something!");
        return;
    }

    // Add to Firebase only - the UI will update automatically via the listener
    saveToFirebase(toDoInput.value, user.uid);
    
    // Clear the input field
    toDoInput.value = '';
}

function handleTodoActions(event) {
    const item = event.target;
    const todo = item.parentElement;
    const todoId = todo.getAttribute('data-id');
    const user = auth.currentUser;

    if (!user) {
        alert('Please login to manage tasks');
        showModal(loginModal);
        return;
    }

    // delete
    if (item.classList[0] === 'delete-btn') {
        todo.classList.add("fall");
        
        // Remove from Firebase
        deleteFromFirebase(todoId, user.uid);
        
        todo.addEventListener('transitionend', function() {
            todo.remove();
        });
    }

    // check
    if (item.classList[0] === 'check-btn') {
        const isCompleted = todo.classList.contains("completed");
        todo.classList.toggle("completed");
        
        // Update completed status in Firebase
        updateTodoInFirebase(todoId, user.uid, {
            completed: !isCompleted
        });
    }
    
    // edit
    if (item.classList[0] === 'edit-btn') {
        const currentText = todo.querySelector('.todo-item').innerText;
        editTodoInput.value = currentText;
        currentEditTodoId = todoId;
        showModal(editModal);
    }
}

function updateTodo() {
    if (!currentEditTodoId || !editTodoInput.value.trim()) return;
    
    const user = auth.currentUser;
    if (!user) return;
    
    // Update text in Firebase - the UI will update automatically via the listener
    updateTodoInFirebase(currentEditTodoId, user.uid, {
        text: editTodoInput.value
    });
    
    // Clear and close
    editTodoInput.value = '';
    currentEditTodoId = null;
    hideAllModals();
}

// Firebase Functions (Using Realtime Database)
function saveToFirebase(todoText, userId) {
    const newTodoRef = database.ref('todos/' + userId).push();
    newTodoRef.set({
        text: todoText,
        completed: false,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    })
    .catch((error) => {
        console.error("Error adding todo: ", error);
        alert('Error adding task. Please try again.');
    });
}

function getTodos(userId) {
    toDoList.innerHTML = '';
    
    database.ref('todos/' + userId).on('value', (snapshot) => {
        toDoList.innerHTML = ''; // Clear the list before adding items
        
        snapshot.forEach((childSnapshot) => {
            const todoId = childSnapshot.key;
            const todoData = childSnapshot.val();
            
            // Create todo element
            createTodoElement(todoId, todoData.text, todoData.completed);
        });
    }, (error) => {
        console.error("Error getting todos: ", error);
    });
}

function createTodoElement(id, text, completed) {
    // toDo DIV
    const toDoDiv = document.createElement("div");
    toDoDiv.classList.add("todo", `${savedTheme}-todo`);
    toDoDiv.setAttribute('data-id', id);
    
    if (completed) {
        toDoDiv.classList.add('completed');
    }

    // Create LI
    const newToDo = document.createElement('li');
    newToDo.innerText = text;
    newToDo.classList.add('todo-item');
    toDoDiv.appendChild(newToDo);

    // check btn
    const checked = document.createElement('button');
    checked.innerHTML = '<i class="fas fa-check"></i>';
    checked.classList.add("check-btn", `${savedTheme}-button`);
    toDoDiv.appendChild(checked);
    
    // delete btn
    const deleted = document.createElement('button');
    deleted.innerHTML = '<i class="fas fa-trash"></i>';
    deleted.classList.add("delete-btn", `${savedTheme}-button`);
    toDoDiv.appendChild(deleted);
    
    // edit btn
    const edit = document.createElement('button');
    edit.innerHTML = '<i class="fas fa-edit"></i>';
    edit.classList.add('edit-btn', `${savedTheme}-button`);
    toDoDiv.appendChild(edit);

    // Append to list
    toDoList.appendChild(toDoDiv);
}

function deleteFromFirebase(todoId, userId) {
    database.ref('todos/' + userId + '/' + todoId).remove()
        .catch((error) => {
            console.error("Error removing todo: ", error);
            alert('Error deleting task. Please try again.');
        });
}

function updateTodoInFirebase(todoId, userId, updates) {
    database.ref('todos/' + userId + '/' + todoId).update(updates)
        .catch((error) => {
            console.error("Error updating todo: ", error);
            alert('Error updating task. Please try again.');
        });
}

// Change theme function:
function changeTheme(color) {
    localStorage.setItem('savedTheme', color);
    savedTheme = localStorage.getItem('savedTheme');

    document.body.className = color;
    // Change blinking cursor for darker theme:
    color === 'darker' ? 
        document.getElementById('title').classList.add('darker-title')
        : document.getElementById('title').classList.remove('darker-title');

    document.querySelector('input').className = `${color}-input`;
    // Change todo color without changing their status (completed or not):
    document.querySelectorAll('.todo').forEach(todo => {
        Array.from(todo.classList).some(item => item === 'completed') ? 
            todo.className = `todo ${color}-todo completed`
            : todo.className = `todo ${color}-todo`;
    });
    // Change buttons color according to their type (todo, check or delete):
    document.querySelectorAll('button').forEach(button => {
        Array.from(button.classList).some(item => {
            if (item === 'check-btn') {
              button.className = `check-btn ${color}-button`;  
            } else if (item === 'delete-btn') {
                button.className = `delete-btn ${color}-button`; 
            } else if (item === 'todo-btn') {
                button.className = `todo-btn ${color}-button`;
            } else if (item === 'edit-btn') {
                button.className = `edit-btn ${color}-button`;
            } else if (item === 'profile-btn') {
                button.className = `profile-btn ${color}-button`;
            } else if (item === 'dropdown-btn') {
                button.className = `dropdown-btn ${color}-button`;
            } else if (item === 'auth-btn') {
                button.className = `auth-btn ${color}-button`;
            }
        });
    });
}