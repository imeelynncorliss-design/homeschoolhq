import chalk from 'chalk';

export function error(message, ...args) {
  console.error(chalk.red('❌ ERROR:'), message, ...args);
}

export function warn(message, ...args) {
  console.warn(chalk.yellow('⚠️  WARN:'), message, ...args);
}

export function info(message, ...args) {
  console.log(chalk.blue('ℹ️  INFO:'), message, ...args);
}

export function success(message, ...args) {
  console.log(chalk.green('✓ SUCCESS:'), message, ...args);
}

export function section(title) {
  console.log('\n' + chalk.bold.cyan('═'.repeat(60)));
  console.log(chalk.bold.cyan(`  ${title}`));
  console.log(chalk.bold.cyan('═'.repeat(60)) + '\n');
}
