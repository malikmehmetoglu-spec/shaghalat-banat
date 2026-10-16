-- التواريخ في قاعدة البيانات (current_date للقيود) بتوقيت دمشق
alter database postgres set timezone to 'Asia/Damascus';
alter role authenticator set timezone to 'Asia/Damascus';
