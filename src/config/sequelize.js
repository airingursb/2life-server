import Sequelize from 'sequelize'

import {SQL_USER, SQL_PASSWORD} from './index'

export const dbConnect = () => {
  return new Sequelize(
    'twolife',
    SQL_USER,
    SQL_PASSWORD,
    {'dialect': 'mysql', host: 'localhost', port: 3306})
}
