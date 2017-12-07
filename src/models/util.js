export const findAll = async (model, condition, include) => {
  return await model.findAll({
    where: condition,
    include: include
  })
}

export const findOne = async (model, condition, option) => {
  return await model.findOne({
    where: condition
  }, option)
}

export const create = async (model, data) => {
  return await model.create(data)
}

export const remove = async (model, condition) => {
  return await model.destroy({
    where: condition
  })
}

export const update = async (model, data, condition) => {
  return await model.update(data, {
    where: condition
  })
}
