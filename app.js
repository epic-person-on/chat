// Initialize Firebase with your configuration object
firebase.initializeApp({
    apiKey: 'AIzaSyCtDvn1P7clVFkeoxMMyyniBVeod8zVLyg',
    authDomain: 'chat-for-bozos.firebaseapp.com',
    projectId: 'chat-for-bozos',
    storageBucket: 'gs://chat-for-bozos.appspot.com', // Replace with your actual storage bucket URL
});

const db = firebase.firestore();
const storage = firebase.storage();

// Function to prompt user for a username and store it
function setUsername() {
    let username = localStorage.getItem('username');
    if (!username) {
        username = prompt('Please enter your username:');
        if (!username) {
            setUsername(); // Reprompt if the user cancels or enters an empty username
            return;
        }
        localStorage.setItem('username', username);
    }
    return username;
}

const username = setUsername();

// DOM Elements
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const chatMessages = document.getElementById('chat-messages');
const fileUpload = document.getElementById('file-upload');
const clearStorageButton = document.getElementById('clear-storage-button');
const offlinePage = document.getElementById('offline-page');

// Check if the user is online/offline
function updateOnlineStatus() {
    if (navigator.onLine) {
        offlinePage.classList.remove('show');
    } else {
        offlinePage.classList.add('show');
    }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Event listener for sending a message
sendButton.addEventListener('click', () => {
    const message = messageInput.value.trim();

    if (message !== '') {
        // Add the message to Firestore
        db.collection('chat-messages').add({
            text: message,
            username: username,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        });

        // Clear the input field
        messageInput.value = '';
    }
});

// Event listener for uploading a file
fileUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        // Generate a unique file name (you can use a library like UUID for this)
        const fileName = `${Date.now()}-${username}-${file.name}`;

        // Reference to the Firebase Storage location
        const storageRef = storage.ref().child('uploads/' + fileName);

        // Upload the file to Firebase Storage
        storageRef.put(file).then((snapshot) => {
            console.log('File uploaded successfully:', snapshot);
            // You can retrieve the file URL and display it in the chat
            snapshot.ref.getDownloadURL().then((downloadURL) => {
                // Add the file URL to Firestore as a message
                db.collection('chat-messages').add({
                    text: downloadURL,
                    username: username,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                });
            });
        }).catch((error) => {
            console.error('File upload error:', error);
        });
    }
});

// Event listener for deleting a message from the UI and Firestore
chatMessages.addEventListener('click', (e) => {
    if (e.target && e.target.classList.contains('delete-button')) {
        const messageDiv = e.target.parentElement;
        const messageId = messageDiv.getAttribute('data-id');

        if (messageId) {
            // Delete the message from Firestore
            db.collection('chat-messages').doc(messageId).delete()
                .then(() => {
                    // Remove the message from the UI
                    messageDiv.remove();
                })
                .catch((error) => {
                    console.error('Error deleting message:', error);
                });
        }
    }
});

// Event listener for clearing local storage and refreshing the page
clearStorageButton.addEventListener('click', () => {
    localStorage.clear();
    location.reload();
});

// Real-time listener for receiving messages
db.collection('chat-messages')
    .orderBy('timestamp')
    .onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const messageDiv = document.createElement('div');
                const messageContent = document.createElement('div');
                const messageText = document.createElement('span');
                const deleteButton = document.createElement('button');

                messageDiv.classList.add('message-bubble');
                messageDiv.setAttribute('data-id', change.doc.id);

                // Check if the message is a media file
                if (change.doc.data().text.startsWith('https://firebasestorage.googleapis.com')) {
                    const mediaLink = document.createElement('a');
                    mediaLink.href = change.doc.data().text;
                    mediaLink.target = '_blank';
                    mediaLink.rel = 'noopener noreferrer';
                    mediaLink.textContent = 'View Media';
                    mediaLink.classList.add('media-link');
                    messageText.innerHTML = `${change.doc.data().username}: `;
                    messageContent.appendChild(messageText);
                    messageContent.appendChild(mediaLink);
                } else {
                    messageText.innerHTML = `<span class="message-username">${change.doc.data().username}:</span> ${change.doc.data().text}`;
                    messageContent.appendChild(messageText);
                }

                deleteButton.textContent = 'Delete';
                deleteButton.classList.add('delete-button');

                messageDiv.appendChild(messageContent);
                messageDiv.appendChild(deleteButton);
                chatMessages.appendChild(messageDiv); // Append to display new messages below the previous ones
            }
        });

        // Scroll to the bottom of the chat container
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });

// Function to display online users in the sidebar
function displayOnlineUsers() {
    const onlineUsersList = document.getElementById('online-users');
    onlineUsersList.innerHTML = ''; // Clear the existing list

    // Query Firestore for online users (you can modify this query as needed)
    db.collection('users').where('online', '==', true).get()
        .then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                const onlineUserItem = document.createElement('li');
                onlineUserItem.classList.add('online-user');
                onlineUserItem.textContent = doc.data().username;
                onlineUsersList.appendChild(onlineUserItem);
            });
        })
        .catch((error) => {
            console.error('Error getting online users:', error);
        });
}

// Function to update user status (online/offline) in Firestore
function updateUserStatus(online) {
    db.collection('users').doc(username).update({
        online: online,
    }).catch((error) => {
        console.error('Error updating user status:', error);
    });
}

// Update user status when the page loads
updateUserStatus(true);

// Update user status when the page unloads (user goes offline)
window.addEventListener('beforeunload', () => {
    updateUserStatus(false);
});

// Real-time listener for online users
db.collection('users').onSnapshot(() => {
    displayOnlineUsers();
});


