# Integración con WordPress

## Opción 1: Usar LicitaSeguro como Tema Personalizado

### Método A: Incrustación en una Página de WordPress

1. **Crear una página en WordPress**
   - Dashboard → Páginas → Añadir Nueva
   - Título: "LicitaSeguro"

2. **Añadir Bloque HTML Personalizado**
   ```html
   <!-- En el editor de bloques, añadir: Bloque HTML Personalizado -->
   <div id="root"></div>
   <script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/react.production.min.js" crossorigin></script>
   <script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/react-dom.production.min.js" crossorigin></script>
   <script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js"></script>
   <script type="text/babel" src="[URL]/LicitaSeguro-App.jsx"></script>
   <script type="text/babel">
       const { createRoot } = ReactDOM;
       const root = createRoot(document.getElementById('root'));
       root.render(<LicitaSeguroApp />);
   </script>
   ```

3. **Cargar CSS en functions.php**
   ```php
   function licitaseguro_enqueue_styles() {
       wp_enqueue_style('licitaseguro-styles', get_template_directory_uri() . '/assets/styles.css');
   }
   add_action('wp_enqueue_scripts', 'licitaseguro_enqueue_styles');
   ```

### Método B: Crear un Plugin de WordPress

1. **Crear estructura:**
   ```
   /wp-content/plugins/licitaseguro/
   ├── licitaseguro.php
   ├── assets/
   │   ├── LicitaSeguro-App.jsx
   │   └── styles.css
   └── readme.txt
   ```

2. **Crear archivo principal: licitaseguro.php**
   ```php
   <?php
   /**
    * Plugin Name: LicitaSeguro
    * Plugin URI: https://licitaseguro.cl/
    * Description: Plataforma de licitaciones públicas integrada en WordPress
    * Version: 1.0
    * Author: Andres Eduardo Rodriguez
    * Author URI: https://developer.example.com/
    * License: GPL2
    */

   // Cargar scripts y estilos
   function licitaseguro_enqueue() {
       // React
       wp_enqueue_script('react', 'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/react.production.min.js', array(), '18.2.0', true);
       wp_enqueue_script('react-dom', 'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/react-dom.production.min.js', array('react'), '18.2.0', true);
       wp_enqueue_script('babel', 'https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js', array(), '7.23.5', true);

       // Componente
       wp_enqueue_script('licitaseguro-app', plugin_dir_url(__FILE__) . 'assets/LicitaSeguro-App.jsx', array('babel'), '1.0', true);

       // Estilos
       wp_enqueue_style('licitaseguro-styles', plugin_dir_url(__FILE__) . 'assets/styles.css', array(), '1.0');
   }
   add_action('wp_enqueue_scripts', 'licitaseguro_enqueue');

   // Shortcode para incrustar
   function licitaseguro_shortcode() {
       return '<div id="root"></div>';
   }
   add_shortcode('licitaseguro', 'licitaseguro_shortcode');

   // Registrar widget
   class Licitaseguro_Widget extends WP_Widget {
       public function __construct() {
           parent::__construct('licitaseguro_widget', 'LicitaSeguro');
       }

       public function widget($args, $instance) {
           echo $args['before_widget'];
           echo '<div id="licitaseguro-widget"></div>';
           echo $args['after_widget'];
       }

       public function form($instance) {
           echo '<p>LicitaSeguro - Plataforma de licitaciones públicas</p>';
       }
   }
   register_widget('Licitaseguro_Widget');
   ?>
   ```

3. **Usar el shortcode en páginas:**
   ```
   [licitaseguro]
   ```

---

## Opción 2: Usar como REST API Backend

Si quieres usar WordPress como backend de la aplicación React:

### 1. Crear Custom Post Type para Licitaciones

```php
// En functions.php del tema
register_post_type('licitacion', array(
    'public' => true,
    'label' => 'Licitaciones',
    'show_in_rest' => true,
    'supports' => array('title', 'editor', 'custom-fields')
));
```

### 2. Crear Custom Endpoint

```php
add_action('rest_api_init', function () {
    register_rest_route('licitaseguro/v1', '/licitaciones', array(
        'methods' => 'GET',
        'callback' => 'get_licitaciones',
        'permission_callback' => '__return_true'
    ));
});

function get_licitaciones() {
    $args = array(
        'post_type' => 'licitacion',
        'posts_per_page' => 10
    );
    $licitaciones = get_posts($args);
    return new WP_REST_Response($licitaciones, 200);
}
```

### 3. Consumir en React

```javascript
// Modificar LicitaSeguro-App.jsx
const cargarLicitaciones = useCallback(async () => {
    const response = await fetch('/wp-json/licitaseguro/v1/licitaciones');
    const data = await response.json();
    // ... procesar datos
}, []);
```

---

## Opción 3: Instalación Standalone (Recomendado para Evaluación)

### Mejor para demostración:
1. No requiere WordPress instalado
2. Funciona en cualquier servidor web
3. Independiente y portable

### Pasos:
1. Subir archivos a servidor web:
   - index.html
   - LicitaSeguro-App.jsx
   - styles.css

2. Acceder por URL directa:
   ```
   https://tu-dominio.com/licitaseguro/
   ```

3. Proteger con .htaccess (opcional):
   ```apache
   <IfModule mod_rewrite.c>
       RewriteEngine On
       RewriteBase /licitaseguro/
       RewriteRule ^index\.html$ - [L]
       RewriteCond %{REQUEST_FILENAME} !-f
       RewriteCond %{REQUEST_FILENAME} !-d
       RewriteRule . /licitaseguro/index.html [L]
   </IfModule>
   ```

---

## Conclusión

Para esta evaluación se recomienda **Opción 3** (Standalone):
- ✅ Más simple de verificar
- ✅ No depende de WordPress
- ✅ Mejor para demostración
- ✅ Más seguro y controlado

Si necesita integración con WordPress, use la **Opción 2** (Plugin) como la más recomendada.

---

**Nota:** Los archivos proporcionados funcionan de forma completamente independiente sin necesidad de WordPress.
