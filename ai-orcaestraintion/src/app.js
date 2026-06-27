import express from 'express'
import morgan from 'morgan'


app.use(express.json());
app.use(express.urlencoded({ extended: true }));



export default app;