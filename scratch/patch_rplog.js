const fs = require('fs');
let content = fs.readFileSync('lib/ridealong-scenarios.js', 'utf8');

content = content.replace(
  /const peopleCount = Math\.floor\(Math\.random\(\) \* 3\) \+ 2/,
  `const peopleCount = Math.floor(Math.random() * 3) + 2
  const duration = (Math.floor(Math.random() * 3) + 2) * 10 + 'm'`
);

content = content.replace(
  /They say they have \$\{peopleCount\} people ready\./,
  `They say they have \${peopleCount} people ready for a \${duration} session.`
);

content = content.replace(
  /They mention having \$\{peopleCount\} people total\./,
  `They mention having \${peopleCount} people total for about \${duration}.`
);

content = content.replace(
  /peopleCount,/,
  `peopleCount, duration, location,`
);

fs.writeFileSync('lib/ridealong-scenarios.js', content);
console.log('Patched rp log generator in scenarios.');
