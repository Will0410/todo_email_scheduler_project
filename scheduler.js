const cron = require('node-cron');
const Todo = require('./models/Todo');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL,
    pass: process.env.MAIL_PASS
  }
});

function startScheduler() {
  // runs every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      // find tasks due in the past or now and not sent
      const tasks = await Todo.find({
        due: { $lte: now },
        sent: false
      });

      for (const task of tasks) {
        // send email
        const info = await transporter.sendMail({
          from: process.env.MAIL,
          to: task.email,
          subject: `Lembrete: ${task.title}`,
          text: `${task.description || ''}\n\nPrazo: ${task.due ? task.due.toLocaleString() : '—'}`
        });

        console.log('Email enviado:', info.response || info.messageId, 'para', task.email);

        task.sent = true;
        await task.save();
      }
    } catch (err) {
      console.error('Erro no scheduler:', err);
    }
  }, { timezone: process.env.SCHED_TZ || 'UTC' });
}

module.exports = { startScheduler };
