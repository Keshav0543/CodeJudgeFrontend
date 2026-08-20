const date=new Date();
let time=date.toLocaleString("en-IN",{day:"2-digit",month:"short"});
console.log(time);