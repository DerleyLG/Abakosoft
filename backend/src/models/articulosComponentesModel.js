const db = require('../database/db');

const ArticuloComponente = {
   
    async create(articuloPadreId, articuloComponenteId, cantidadRequerida) {
        const [result] = await db.query(
            "INSERT INTO articulos_componentes (articulo_padre_id, articulo_componente_id, cantidad_requerida) VALUES (?, ?, ?)",
            [articuloPadreId, articuloComponenteId, cantidadRequerida]
        );
        return result.insertId;
    },

 async CreateComponentesEnLote(articuloPadreId, componentes, connection) {
        const values = componentes.map(c => [articuloPadreId, c.id, c.cantidad]);
        const sql = "INSERT INTO articulos_componentes (articulo_padre_id, articulo_componente_id, cantidad_requerida) VALUES ?";
        
      
        const [result] = await connection.query(sql, [values]);
        return result.affectedRows;
    },

   async getByArticuloPadreId(articuloPadreId) {
       
        const [rows] = await db.query(
            `SELECT 
                ac.articulo_componente_id AS id_articulo,
                a.referencia,
                a.descripcion,
                a.precio_venta,
                a.precio_costo,
                a.id_categoria,
                a.es_compuesto,
                ac.cantidad_requerida
            FROM 
                articulos_componentes ac
            JOIN 
                articulos a ON ac.articulo_componente_id = a.id_articulo
            WHERE 
                ac.articulo_padre_id = ?`,
            [articuloPadreId]
        );
        return rows;
    },

    
    async deleteByArticuloPadreId(articuloPadreId) {
        const [result] = await db.query(
            "DELETE FROM articulos_componentes WHERE articulo_padre_id = ?",
            [articuloPadreId]
        );
        return result;
    },
};

module.exports = ArticuloComponente;