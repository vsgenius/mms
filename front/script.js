wsUrl = 'localhost:3000';

const btnSend = document.getElementById('btn-send');
let socket;
const modalLogin = new bootstrap.Modal(document.getElementById('modalLogin'));
const addChat = new bootstrap.Modal(document.getElementById('addChat'));
const loginBtn = document.getElementById('loginBtn');
const inputMessage = document.getElementById('input-message');
const typingField = document.querySelector('.typing');
const addChatSave = document.querySelector('#save-chat');
const chatList = document.querySelector('.chat-list');
const fieldMessages = document.querySelector('.field-messages');
const userOnline = document.querySelector('.user-online');
const btnVoice = document.querySelector('#btn-voice');
const exit = document.querySelector('.exit');

let timer;
let currentChat;
const chatCountMessages = {};
let cashBlob;

function clearBody() {
  chatList.innerHTML = '';
  fieldMessages.innerHTML = '';
}
exit.addEventListener('click', () => {
  clearBody();
  localStorage.removeItem('login');
  localStorage.removeItem('id');
  localStorage.removeItem('token');
});

inputMessage.addEventListener('input', (e) => {
  const id = localStorage.getItem('id');
  const token = localStorage.getItem('token');
  socket.send(
    JSON.stringify({
      type: 'typing',
      message: {
        user_id: id,
        chat_id: currentChat,
        text: 'start-typing',
      },
      token: token,
    })
  );
  if (timer) {
    clearTimeout(timer);
  }
  timer = setTimeout(() => {
    timer = undefined;
    socket.send(
      JSON.stringify({
        type: 'typing',
        message: {
          user_id: id,
          chat_id: currentChat,
          text: 'stop-typing',
        },
        token: token,
      })
    );
  }, 3000);
});

inputMessage.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    btnSend.click();
  }
});

btnSend.addEventListener('click', (e) => {
  const { id, login, token } = localStorage;
  e.preventDefault();
  const target = e.target
    .closest('.field-send')
    .querySelector('#input-message');
  if (!target.value) return;
  const textMessage = target.value;
  target.value = '';
  const message = {
    chat_id: currentChat,
    user_id: id,
    text: textMessage,
    login,
    date: Date.now(),
  };
  socket.send(
    JSON.stringify({
      type: 'message',
      message: message,
      token: token,
    })
  );
  createMessage('my', message);
});

function formatDate(date) {
  const newDate = new Date(date);
  return `${newDate.getHours()}:${newDate.getMinutes()}:${newDate.getSeconds()}  ${newDate.getDate()}.${
    newDate.getMonth() + 1
  }.${newDate.getFullYear()}`;
}

function createMessage(who, message) {
  const fieldMessages = document.querySelector('.field-messages');
  let template;
  if (who === 'my') {
    template = document.getElementById('message-my').content.cloneNode(true);
  } else {
    template = document.getElementById('message-other').content.cloneNode(true);
    const login = template.querySelector('.login');
    login.textContent = message.login;
  }
  if (message.audio) {
    const messageAudio = template.querySelector('.message-audio');
    const audio = document.createElement('audio');
    const clipContainer = document.createElement('article');
    clipContainer.classList.add('clip');
    audio.style.width = '100%';
    audio.setAttribute('controls', '');
    clipContainer.appendChild(audio);
    audio.controls = true;

    if (message.audio instanceof Blob) {
      const reader = new FileReader();
      reader.onload = function (e) {
        audio.src = e.target.result;
      };
      reader.readAsDataURL(message.audio);
    } else {
      audio.src = 'http://' + wsUrl + message.audio;
    }
    messageAudio.append(clipContainer);
  }
  if (message.text) {
    const messageText = template.querySelector('.message-text');
    messageText.textContent = message.text;
  }
  if (message.date) {
    const date = template.querySelector('.date');
    date.textContent = message.date ? formatDate(message.date) : '';
  }

  fieldMessages.append(template);
  fieldMessages.scrollTop = fieldMessages.scrollHeight;
}

function addNotification(message) {
  const chats = document.querySelectorAll('.chat-body');
  chats.forEach((chat) => {
    if (chat.dataset.id === message.chat_id) {
      const badge = chat.querySelector('.badge');
      badge.textContent = Number(badge.textContent) + 1;
      if (badge.classList.contains('hidden')) {
        badge.classList.remove('hidden');
      }
    }
  });
}

function createToast(message) {
  const toastLiveExample = document.querySelector('#liveToast');
  toastLiveExample.querySelector('#message-login').textContent = message.login;
  toastLiveExample.querySelector('#message-date').textContent = formatDate(
    message.date
  );
  toastLiveExample.querySelector('#message-text').textContent = message.text;
  const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toastLiveExample);
  toastBootstrap.show();
  addNotification(message);
}

// function startChat() {
//   socket.addEventListener('open', (e) => {
//     socket.send(JSON.stringify({
//       type:'chats',
//       token:localStorage.getItem('token')
//     }));
//     socket.addEventListener('message', (event) => {
//       const id = localStorage.getItem('id');
//       console.log('message');
//       const data = JSON.parse(event.data);
//       console.log(data);
//       if (!data) return;
//       if (data.type === 'chats') {
//         loadChats(data.message);
//         return;
//       }
//       if (data.type === 'chat-messages') {
//         data.message.forEach((element) => {
//           if (element.message.user_id === id) {
//             createMessage('my', element.message);
//           } else {
//             createMessage('other', element.message);
//           }
//         });
//       }
//       if (data.type === 'message') {
//         if (data.message.user_id !== id) {
//           if (data.message.chat_id === currentChat) {
//             createMessage('other', data.message);
//           } else {
//             addNotification(data.message);
//           }
//         }
//         return;
//       }
//       if (data.type === 'audio') {
//         if (data.message.user_id !== id) {
//           if (data.message.chat_id === currentChat) {
//             createMessage('other', data.message);
//           } else {
//             addNotification(data.message);
//           }
//         }
//         return;
//       }
//       if (data.type === 'typing' && data.message.chat_id === currentChat) {
//         if (!data.message.typing.length) {
//           typingField.classList.add('hidden');
//         } else {
//           typingField.textContent = data.message.typing.length + ' печатает';
//           typingField.classList.remove('hidden');
//         }
//         return;
//       }
//     });
//   });
// }

chatList.addEventListener('click', (e) => {
  const { id, login, token } = localStorage;
  const chat = e.target.closest('.chat-body');
  const fieldsSend = document.querySelector('.input-group').childNodes;
  if (!chat) return;
  if (socket.readyState === 3) {
    clearBody();
    contentLoadedHandle();
  }
  document.querySelector('.active') &&
    document.querySelector('.active').classList.remove('active');
  chat.classList.toggle('active');
  currentChat = chat.dataset.id;
  fieldMessages.innerHTML = '';
  socket.send(
    JSON.stringify({
      type: 'chat-messages',
      message: {
        chat_id: currentChat,
        user_id: id,
      },
      token: token,
    })
  );
  chat.querySelector('.badge').classList.add('hidden');
  fieldsSend.forEach((field) => {
    field.disabled = '';
  });
});

loginBtn.addEventListener('click', async (e) => {
  const login = e.target
    .closest('.modal-content')
    .querySelector('#loginInput').value;
  const password = e.target
    .closest('.modal-content')
    .querySelector('#loginPassword').value;
  if (!login || !password) return;
  const response = await fetch('http://' + wsUrl + '/login', {
    method: 'POST',
    headers: {
      'Content-type': 'application/json',
    },
    body: JSON.stringify({ login, password }),
  });
  const result = await response.json();
  if (!result.token) return;
  localStorage.setItem('token', result.token);
  localStorage.setItem('id', result.user._id);
  localStorage.setItem('login', result.user.login);
  socket.send(
    JSON.stringify({
      type: 'chats',
      token: result.token,
    })
  );
  modalLogin.hide();
});

addChatSave.addEventListener('click', async (e) => {
  const token = localStorage.getItem('token');
  if (!token) return;
  const chatNameInput = e.target
    .closest('.modal-content')
    .querySelector('#chatNameInput').value;
  const response = await fetch('http://' + wsUrl + '/newchat', {
    method: 'POST',
    headers: {
      'Content-type': 'application/json',
    },
    body: JSON.stringify({ token, name: chatNameInput }),
  });
  const result = await response.json();
  console.log(result);
  const chatList = document.querySelector('.chat-list');
  const template = document.getElementById('chat-item').content.cloneNode(true);
  const nameChat = template.querySelector('.name-chat');
  nameChat.textContent = chatNameInput;
  const chatBody = template.querySelector('.chat-body');
  chatBody.dataset.id = result.insertedId;
  chatList.append(template);
});

async function loadChats(listChats) {
  listChats.forEach((chat) => {
    const template = document
      .getElementById('chat-item')
      .content.cloneNode(true);
    const nameChat = template.querySelector('.name-chat');
    nameChat.textContent = chat.name;
    const chatBody = template.querySelector('.chat-body');
    chatBody.dataset.id = chat._id;
    chatList.append(template);
  });
}

start = true;
if (navigator.mediaDevices) {
  const constraints = { audio: true };
  let chunks = [];

  navigator.mediaDevices
    .getUserMedia(constraints)
    .then((stream) => {
      const mediaRecorder = new MediaRecorder(stream);

      btnVoice.onclick = () => {
        if (start) {
          mediaRecorder.start();
          console.log(mediaRecorder.state);
          console.log('recorder started');
          btnVoice.style.background = 'red';
          btnVoice.style.color = 'black';
          start = false;
        } else {
          mediaRecorder.stop();
          console.log(mediaRecorder.state);
          console.log('recorder stopped');
          btnVoice.style.background = '';
          btnVoice.style.color = '';
          start = true;
        }
      };

      mediaRecorder.onstop = async (e) => {
        const { id, login, token } = localStorage;
        const blob = new Blob(chunks, {
          type: 'audio/webm;codecs=opus',
        });
        socket.send(
          JSON.stringify({
            type: 'audio',
            message: {
              user_id: id,
              chat_id: currentChat,
              login,
            },
            token: token,
          })
        );
        createMessage('my', { audio: blob });
        cashBlob = blob;
        chunks = [];
      };

      mediaRecorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };
    })
    .catch((err) => {
      console.error(`The following error occurred: ${err}`);
    });
}

function contentLoadedHandle() {
  socket = new WebSocket('ws://' + wsUrl);
  const token = localStorage.getItem('token');
  if (!token) {
    modalLogin.show();
    return;
  }
  socket.addEventListener('open', (e) => {
    socket.addEventListener('message', (event) => {
      const id = localStorage.getItem('id');
      const data = JSON.parse(event.data);
      if (!data) return;
      if (data.type === 'chats') {
        loadChats(data.message);
        return;
      }
      if (data.type === 'online') {
        console.log(data);
        userOnline.textContent = data.message;
      }
      if (data.type === 'blob') {
        if (!cashBlob) return;
        socket.send(cashBlob);
      }
      if (data.type === 'audio') {
        if (data.message.user_id !== id) {
          if (data.message.chat_id === currentChat) {
            createMessage('other', data.message);
          } else {
            createToast(data.message);
          }
        }
        return;
      }
      if (data.type === 'chat-messages') {
        // userOnline.classList.remove('hidden');
        data.message.forEach((element) => {
          if (element.message.user_id === id) {
            createMessage('my', element.message);
          } else {
            createMessage('other', element.message);
          }
        });
      }
      if (data.type === 'message') {
        if (data.message.user_id !== id) {
          if (data.message.chat_id === currentChat) {
            createMessage('other', data.message);
          } else {
            createToast(data.message);
          }
        }
        return;
      }
      if (data.type === 'typing' && data.message.chat_id === currentChat) {
        if (!data.message.typing.length) {
          typingField.classList.add('hidden');
        } else {
          typingField.textContent = data.message.typing.length + ' печатает';
          typingField.classList.remove('hidden');
        }
        return;
      }
    });
    socket.send(
      JSON.stringify({
        type: 'chats',
        token: localStorage.getItem('token'),
      })
    );
  });
}

window.addEventListener('DOMContentLoaded', contentLoadedHandle);
