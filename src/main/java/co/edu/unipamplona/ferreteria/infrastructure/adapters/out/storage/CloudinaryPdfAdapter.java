package co.edu.unipamplona.ferreteria.infrastructure.adapters.out.storage;

import co.edu.unipamplona.ferreteria.application.exception.AlmacenamientoNoDisponibleException;
import co.edu.unipamplona.ferreteria.application.port.out.AlmacenPdfPort;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import java.io.IOException;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Adaptador de salida: publica los PDF de factura en Cloudinary.
 *
 * Dos modos, en este orden:
 * 1. Firmado con {@code CLOUDINARY_URL} (recomendado para facturas).
 * 2. Unsigned con {@code CLOUDINARY_CLOUD_NAME} + {@code CLOUDINARY_UPLOAD_PRESET}.
 *
 * Si la publicacion falla, la venta no se cae: el caso de uso lo trata como best-effort.
 */
@Component
public class CloudinaryPdfAdapter implements AlmacenPdfPort {

    private static final String CARPETA = "ferreteria/facturas";

    private final Cloudinary cloudinary;
    /** null cuando se usa el modo firmado. */
    private final String unsignedPreset;

    @Autowired
    public CloudinaryPdfAdapter(@Value("${ferreteria.cloudinary.url:}") String cloudinaryUrl,
                                @Value("${ferreteria.cloudinary.cloud-name:}") String cloudName,
                                @Value("${ferreteria.cloudinary.upload-preset:}") String uploadPreset) {
        this(toCloudinary(cloudinaryUrl, cloudName, uploadPreset), blank(uploadPreset) ? null : uploadPreset.trim());
    }

    CloudinaryPdfAdapter(Cloudinary cloudinary, String unsignedPreset) {
        this.cloudinary = cloudinary;
        this.unsignedPreset = unsignedPreset;
    }

    private static Cloudinary toCloudinary(String cloudinaryUrl, String cloudName, String uploadPreset) {
        if (!blank(cloudinaryUrl)) {
            return new Cloudinary(cloudinaryUrl.trim());
        }
        if (!blank(cloudName) && !blank(uploadPreset)) {
            return new Cloudinary(ObjectUtils.asMap("cloud_name", cloudName.trim(), "secure", true));
        }
        return null;
    }

    @Override
    public boolean disponible() {
        return cloudinary != null;
    }

    @Override
    @SuppressWarnings({"unchecked", "rawtypes"})
    public String publicarFactura(byte[] contenido, String numeroFactura) {
        if (cloudinary == null) {
            throw new AlmacenamientoNoDisponibleException(
                    "Cloudinary no esta configurado; defina CLOUDINARY_URL o CLOUDINARY_CLOUD_NAME + CLOUDINARY_UPLOAD_PRESET");
        }
        if (contenido == null || contenido.length == 0) {
            throw new AlmacenamientoNoDisponibleException("El PDF de la factura esta vacio");
        }
        if (numeroFactura == null || numeroFactura.isBlank()) {
            throw new AlmacenamientoNoDisponibleException("La factura no tiene numero para publicar su PDF");
        }

        try {
            Map<?, ?> resultado = unsignedPreset != null
                    ? cloudinary.uploader().unsignedUpload(contenido, unsignedPreset, ObjectUtils.emptyMap())
                    : cloudinary.uploader().upload(contenido, signedOptions(numeroFactura));
            Object url = resultado.get("secure_url");
            if (url == null) {
                throw new AlmacenamientoNoDisponibleException("Cloudinary no devolvio la URL del PDF");
            }
            return url.toString();
        } catch (IOException e) {
            throw new AlmacenamientoNoDisponibleException("No se pudo publicar el PDF en Cloudinary", e);
        }
    }

    private static Map<String, Object> signedOptions(String numeroFactura) {
        return ObjectUtils.asMap(
                "public_id", CARPETA + "/" + numeroFactura.trim(),
                "overwrite", true,
                "invalidate", true,
                "resource_type", "image"
        );
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
