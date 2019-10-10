function setPhoneNumber() {
  fetch('/dash', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      phoneNumber: document.querySelector('#phoneNumber').value
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data) window.location.reload();
    });
}
function nextUp() {
  fetch('/nextup', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      next: true
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data) window.location.reload();
    });
}
function endGame() {
  const score = document.querySelector('#score').value;
  if (score >= 21 || score <= 0) {
    document.querySelector('#invalid').classList.add('visible');
  } else {
    document.querySelector('#invalid').classList.remove('visible');
    fetch('/end', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        game: document.querySelector('#score').getAttribute('name'),
        score: document.querySelector('#score').value
      })
    })
      .then(res => res.json())
      .then(data => {
        console.log(data);
      });
  }
}
