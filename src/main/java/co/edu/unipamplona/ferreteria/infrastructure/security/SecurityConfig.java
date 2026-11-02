package co.edu.unipamplona.ferreteria.infrastructure.security;

import java.time.Clock;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/** Seguridad de la API REST. */
@Configuration
@EnableConfigurationProperties(JwtProperties.class)
public class SecurityConfig {

    @Bean
    JwtTokenValidator jwtTokenValidator(JwtProperties propiedades, Clock reloj) {
        return new JwtTokenValidator(propiedades.secretBase64(), reloj);
    }

    @Bean
    SecurityFilterChain filtros(HttpSecurity http, JwtTokenValidator validador) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)                       // API sin sesión ni cookies
            .cors(Customizer.withDefaults())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a
                // Administrar proveedores y productos es del ADMIN.
                .requestMatchers(HttpMethod.POST, "/api/proveedores", "/api/productos", "/api/productos/*/desactivar",
                        "/api/productos/*/activar").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/proveedores/*", "/api/productos/*").hasRole("ADMIN")
                // Compras, comparación de precios, anulaciones y reportes: solo ADMIN. (Va antes que la regla general de GET productos.)
                .requestMatchers("/api/compras/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/productos/*/comparacion-precios").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/facturas/*/anulacion").hasRole("ADMIN")
                .requestMatchers("/api/reportes/**").hasRole("ADMIN")
                // El seed de desarrollo reinicia la base: solo ADMIN.
                .requestMatchers(HttpMethod.POST, "/api/seed").hasRole("ADMIN")
                // Vender y consultar: cualquier usuario autenticado (ADMIN o USER). El dominio vuelve a verificar el rol.
                .requestMatchers(HttpMethod.GET, "/api/proveedores", "/api/proveedores/*", "/api/productos", "/api/productos/*")
                        .authenticated()
                .requestMatchers(HttpMethod.POST, "/api/facturas").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/facturas/*", "/api/facturas/*/pdf").authenticated()
                // Lo demás se niega por defecto.
                .anyRequest().denyAll())
            .exceptionHandling(e -> e
                .authenticationEntryPoint((req, res, ex) -> escribir(res, 401, "No autenticado: falta un token válido"))
                .accessDeniedHandler((req, res, ex) -> escribir(res, 403, "No tiene permiso para esta operación")))
            .addFilterBefore(new JwtAuthenticationFilter(validador), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    private static void escribir(jakarta.servlet.http.HttpServletResponse res, int estado, String mensaje)
            throws java.io.IOException {
        res.setStatus(estado);
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding("UTF-8");
        res.getWriter().write("{\"status\":" + estado + ",\"mensaje\":\"" + mensaje + "\"}");
    }
}
